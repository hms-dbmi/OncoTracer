import { getTextWidth } from 'modules/UtilityClasses'
import React from 'react'

export interface GlyphProps {
    xScale: d3.ScaleLinear<number, number> | ((n:number)=>number), 
    values: {value:string|number|boolean, counts: number}[], 
    featureDomain: (string|number|boolean)[], 
    cellHeight: number,
    type: string,
    showLabel?: boolean
}


interface DetailGlyphProps extends GlyphProps {
    getRectHeight: (value: any)=>number,
    getRectY: (value: any)=>number
}


function CellGlyph(props:GlyphProps){
    const {type, cellHeight, featureDomain} = props
    const getRectHeight = type === "number"? 
        (v: number):number=> cellHeight*(v- (featureDomain[0] as number))/( (featureDomain[1] as number) - (featureDomain[0] as number))
        : (v:string):number=>cellHeight/featureDomain.length
    const getRectY = type === "number"? 
        (v: number):number=>cellHeight*(featureDomain[1] as number - v )/(featureDomain[1] as number - (featureDomain[0] as number))
        : (v:string):number=> featureDomain.indexOf(v)/featureDomain.length * cellHeight
    const detailProps = {
        ...props,
        getRectHeight,
        getRectY
    }
    return type == "number"? CellNumGlyph(detailProps): CellCateGlyph(detailProps)
}

function CellCateGlyph(props: DetailGlyphProps){
    const maxFontSize = 12, MinFontSize = 7
    const {values, xScale, getRectHeight, getRectY, showLabel} = props
    let rowBars: JSX.Element[] = [], currentX = 0

    values.forEach(d => {
        const { value, counts } = d
        const binWidth = xScale(counts), binHeight = getRectHeight(value), offsetY = getRectY(value)
        const labelFontSize = Math.min( maxFontSize, Math.max(binHeight, MinFontSize))

        const oneCate = <g className={`${value}`} key={`${value}`}>
            <rect className={`${value}`} key={`${value}`} x={currentX} width={binWidth} height={binHeight} y={offsetY} fill="lightgray" />
            {
                showLabel && getTextWidth(`${value}`, labelFontSize) < binWidth ? 
                <text fontSize={labelFontSize} y={offsetY + (binHeight+labelFontSize)/2} x={currentX}>{value}</text>
                :<></>
            }
            </g>
        rowBars.push(oneCate)
        currentX += binWidth
    })

    return <g className="rowBars">{rowBars}</g>
}

function CellNumGlyph(props: DetailGlyphProps){
    const {values, getRectHeight, cellHeight, xScale} = props
    let pathString = `M 0, ${cellHeight}`, currentPos = [0, 0]

    values.forEach(d => {
        const { value, counts } = d
        const binWidth = xScale(counts), binHeight = getRectHeight(value)
        pathString += `l${0},${-binHeight - currentPos[1]} l ${binWidth}, ${0}`
        currentPos = [binWidth + currentPos[0], -1 * binHeight]
    })
    pathString += `l 0 ${-1 * currentPos[1]} z`

    return <path d={pathString} fill='lightgray' stroke='lightgray' strokeWidth={1}/>
}

export default CellGlyph