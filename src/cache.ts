// Put it in a separate file so its maintained across requests
export const cachedVehiclePositions: {
    data: {
        positions: BusPosition[],
        lastUpdated: Date
    } | undefined
} = { data: undefined }

export const cachedVehiclePositionsExpiryTimeMs = 1000*20

export interface BusPosition {
    latitude: number,
    longitude: number,
    bearing: number,
    speed: number
}