import protobuf from 'protobufjs'
import axios from 'axios'
import { cachedVehiclePositions, cachedVehiclePositionsExpiryTimeMs, type BusPosition } from '../cache'

export async function GET() {

    if (!cachedVehiclePositions.data || cachedVehiclePositions.data.lastUpdated.getTime() + cachedVehiclePositionsExpiryTimeMs < new Date().getTime()) {
        
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

        const positions = message.entity.map((entity) => entity.vehicle.position)

        // Cache variable
        cachedVehiclePositions.data = {
            positions,
            lastUpdated: new Date()
        }

        console.log('Successfully fetched bus data')
    }

    return new Response(JSON.stringify(cachedVehiclePositions.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
    });

}
