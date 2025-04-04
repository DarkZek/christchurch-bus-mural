<script lang="ts" setup>
import BusIcon from './BusIcon.vue'
import type { cachedVehiclePositionsExpiryTimeMs, BusInfo, BusPosition } from '../bus'
import { ref } from 'vue'

const mapConfig = {
    leftEdgeLongitude: 172.25766667,
    rightEdgeLongitude: 172.97376944,
    bottomEdgeLongitude: -43.68309167,
    imageAspectRatio: 4096 / 2865
}

const busses = ref<BusInfo[]>()

async function loadBusses() {
    try {
        const data = await fetch('./data.json')

        busses.value = (await data.json()).busses as BusInfo[]
    } catch (e) {
        alert('Fetching bus information failed. Try again later')
    }

    setTimeout(loadBusses, 5000)
}
loadBusses()

// https://stackoverflow.com/questions/2103924/mercator-longitude-and-latitude-calculations-to-x-and-y-on-a-cropped-map-of-the
function convertGeoToPixel(
    latitude: number,
    longitude: number,
    mapWidth: number, // in pixels
    mapHeight: number, // in pixels
    mapLngLeft: number, // in degrees. the longitude of the left side of the map (i.e. the longitude of whatever is depicted on the left-most part of the map image)
    mapLngRight: number, // in degrees. the longitude of the right side of the map
    mapLatBottom: number // in degrees.  the latitude of the bottom of the map
)
{
    const mapLatBottomRad = mapLatBottom * Math.PI / 180
    const latitudeRad = latitude * Math.PI / 180
    const mapLngDelta = (mapLngRight - mapLngLeft)

    const worldMapWidth = ((mapWidth / mapLngDelta) * 360) / (2 * Math.PI)
    const mapOffsetY = (worldMapWidth / 2 * Math.log((1 + Math.sin(mapLatBottomRad)) / (1 - Math.sin(mapLatBottomRad))))

    const x = (longitude - mapLngLeft) * (mapWidth / mapLngDelta)
    const y = mapHeight - ((worldMapWidth / 2 * Math.log((1 + Math.sin(latitudeRad)) / (1 - Math.sin(latitudeRad)))) - mapOffsetY)

    return {x, y} // the pixel x,y value of this point on the map image
}

function getStyle(bus: BusInfo) {
    const relativeBusPosition = convertGeoToPixel(
        bus.position.latitude,
        bus.position.longitude,
        document.documentElement.clientHeight * mapConfig.imageAspectRatio,
        document.documentElement.clientHeight,
        mapConfig.leftEdgeLongitude,
        mapConfig.rightEdgeLongitude,
        mapConfig.bottomEdgeLongitude
    )

    let rotation = bus.position.bearing

    let flipped = false

    if (rotation > 180) {
        flipped = true
        rotation -= 180
    }
    
    return {
        top: `${relativeBusPosition.y * 1.0}px`,
        left: `${relativeBusPosition.x * 1.0}px`,
        rotate: `${rotation - 90}deg`,
        scale: `${flipped ? -1 : 1} 1`
    }
} 

</script>

<template>
    <div>
        <div
            v-for="bus of busses"
            class="bus"
            :style="getStyle(bus)"
        >
            <BusIcon 
                :color="bus.color"
            />
            <span
                class="name"
            >{{ bus.code }}</span>
        </div>  
    </div>  
</template>

<style lang="scss" scoped>
.bus {
    position: absolute;
    width: 32px;
    height: 32px;
    transform-origin: center;
    transform: translate(-16px, -16px);
    display: flex;
    flex-direction: column;

    img {
        width: 100%;
        margin-top: -4px;
    }

    .name {
        color: rgba(255, 255, 255, 0.8);
        margin-top: -3px;
        width: 100%;
        text-align: center;
        font-size: 8px;
        font-weight: bold;
        font-family: sans-serif;
    }
}
</style>
