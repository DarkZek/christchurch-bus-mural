<script lang="ts" setup>
import BusIcon from './BusIcon.vue'
import type { cachedVehiclePositionsExpiryTimeMs, BusInfo, BusPosition } from '../bus'
import { computed, nextTick, ref } from 'vue'

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

        nextTick(animateBusses)
    } catch (e) {
        alert('Fetching bus information failed. Try again later')
    }

    setTimeout(loadBusses, 10000)
}
loadBusses()

function animateBusses() {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    for (const [i, bus] of busses.value!.entries()) {

        const directionRadians = (bus.position.bearing + 0) * (Math.PI / 180)

        const x = Math.cos(directionRadians) * bus.position.speed * 0.1
        const y = Math.sin(directionRadians) * bus.position.speed * 0.1

        document.getElementById(`bus-${i}`)?.animate([
            { transform: "translate(0, 0)" },
            { transform: `translate(${x}px, ${y}px)` },
        ], { duration: 10000, easing: 'linear' })
    }
}

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

const busPixelCoordinates = computed(() => {
    return busses.value?.map((bus) => convertGeoToPixel(
        bus.position.latitude,
        bus.position.longitude,
        document.documentElement.clientHeight * mapConfig.imageAspectRatio,
        document.documentElement.clientHeight,
        mapConfig.leftEdgeLongitude,
        mapConfig.rightEdgeLongitude,
        mapConfig.bottomEdgeLongitude
    ))
})

function dist(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2)
}

function getStyle(bus: BusInfo, i: number) {
    
    // Get how many other busses are close by
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const busCoordinates = busPixelCoordinates.value![i]

    // Get how many other busses are within 100px and get their average distance
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const closeBusses = busPixelCoordinates.value!
        .map((busPos) => dist(busPos.x, busPos.y, busCoordinates.x, busCoordinates.y))
        .filter((busDist, busIndex) => {
            if (i === busIndex) return false
            return busDist < 100
        })

    // Reduce size of bus as distance decreases
    let busSize = Math.max(0.5, Math.E ** (-0.05 * closeBusses.length))

    busSize *= 2

    let rotation = bus.position.bearing

    let flipped = false

    // TODO: Revisit to make this not flip the text
    // if (rotation < 180) {
    //     flipped = true
    //     rotation -= 180
    // }
    
    return {
        top: `${busCoordinates.y - 16}px`, // Offset by 16 to center bus on point
        left: `${busCoordinates.x - 16}px`,
        rotate: `${rotation + 90}deg`,
        scale: `${flipped ? -busSize : busSize} ${busSize}`
    }
} 

</script>

<template>
    <div>
        <div
            v-for="bus, i of busses"
            class="bus"
            :style="getStyle(bus, i)"
            :id="`bus-${i}`"
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
    display: flex;
    flex-direction: column;
    transition: rotate 0.5s ease-in-out;

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
