import protobuf from 'protobufjs'
import axios from 'axios'
import AdmZip from "adm-zip"
import fs from 'node:fs'

// Put it in a separate file so its maintained across requests
export const cachedVehiclePositions: {
    data: {
        busses: BusInfo[],
        lastUpdated: Date
    } | undefined
} = { data: undefined }

export async function fetchVehiclePositions() {
    if (cachedVehiclePositions.data &&
        cachedVehiclePositions.data.lastUpdated.getTime() + cachedVehiclePositionsExpiryTimeMs > new Date().getTime()) {
        return
    }

    await fetchVehicleRoutes()
    
    const httpResponse = await axios.get(
        'https://apis.metroinfo.co.nz/rti/gtfsrt/v1/vehicle-positions.pb',
        {
            headers: {
                'Ocp-Apim-Subscription-Key': import.meta.env.METRO_API_KEY
            },
            responseType: 'arraybuffer'
        })

    const payloadBytes = httpResponse.data as Uint8Array

    const root = await protobuf.load('./src/gtfs-realtime.proto')

    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

    // Non exhaustive
    interface FeedMessageType {
        entity: {
            vehicle: {
                trip: {
                    tripId: string,
                    startTime: string,
                    startDate: string,
                    scheduleRelationship: string,
                    routeId: string
                }
                position: BusPosition
                currentStopSequence: number
                currentStatus: "IN_TRANSIT_TO" | "STOPPED_AT"
                timestamp: number
                stopId: number
                vehicle: {
                    id: string
                    label: string
                },
            },
        }[]
    }

    const message = FeedMessage.decode(payloadBytes) as unknown as FeedMessageType

    const busses = message.entity.map((entity) => {

        // biome-ignore lint/style/noNonNullAssertion: It's set at the top of the function
        const routeInfo = cachedRoutes![entity.vehicle.trip.routeId] ?? { code: '?', name: '?', color: '000000' }

        return {
            ...routeInfo,
            position: entity.vehicle.position
        }
    })

    // Cache variable
    cachedVehiclePositions.data = {
        busses,
        lastUpdated: new Date()
    }

    console.log('Successfully fetched bus data')
}

type CachedRoutes = Record<string, {
    code: string,
    name: string,
    color: string
}>

export let cachedRoutes: undefined | CachedRoutes


export async function fetchVehicleRoutes() {
    // No expiry on static data
    if (cachedRoutes) {
        return
    }

    const fileName = 'gfts.zip'

    if (!fs.existsSync(fileName)) {

        console.log(`Fetching new ${fileName}`)

        // Cache file
        const httpResponse = await axios.get(
            'https://apis.metroinfo.co.nz/rti/gtfs/v1/gtfs.zip',
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': import.meta.env.METRO_API_KEY
                },
                responseType: 'arraybuffer'
            })

        fs.writeFileSync(fileName, httpResponse.data)
    } else {
        console.log(`Using cached ${fileName}`)
    }

    const zipData = fs.readFileSync(fileName)

    const zip = new AdmZip(zipData);

    const routes = zip.getEntry("routes.txt")

    if (!routes) {
        throw new Error(`Routes file does not exist in ${fileName}`)
    }

    const csvRoutes = routes.getData().toString().split('\n')

    const routeIdToNameMapping: CachedRoutes = {}
    for (const route of csvRoutes) {
        const [routeId, agencyId, routeShortName, routeLongName, _1, routeType, _2, routeColor] = route.split(',')
        routeIdToNameMapping[routeId] = { code: routeShortName, name: routeLongName, color: routeColor }
    }

    cachedRoutes = routeIdToNameMapping

    console.log('Successfully fetched route data')
}

export const cachedVehiclePositionsExpiryTimeMs = 1000*20

export interface BusInfo {
    position: BusPosition
    name: string,
    code: string,
    color: string
}

export interface BusPosition {
    latitude: number
    longitude: number
    bearing: number
    speed: number
}