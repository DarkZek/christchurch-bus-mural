import { cachedVehiclePositions, cachedVehiclePositionsExpiryTimeMs, fetchVehiclePositions, type BusPosition } from '../bus'

export async function GET() {

    await fetchVehiclePositions()

    return new Response(JSON.stringify(cachedVehiclePositions.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
    });

}
