import protobuf from 'protobufjs'
import axios from 'axios'
import { cachedVehiclePositions, cachedVehiclePositionsExpiryTimeMs, type BusPosition } from '../cache'

export async function GET() {

    if (!cachedVehiclePositions.data || cachedVehiclePositions.data.lastUpdated.getTime() > new Date().getTime() + cachedVehiclePositionsExpiryTimeMs) {
        
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
                }
            }[]
        }

        const message = FeedMessage.decode(payloadBytes) as unknown as FeedMessageType

        const positions = message.entity.map((entity) => entity.vehicle.position)

        // Cache variable
        cachedVehiclePositions.data = {
            positions,
            lastUpdated: new Date()
        }
    }

    return new Response(JSON.stringify(cachedVehiclePositions.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
    });

}
