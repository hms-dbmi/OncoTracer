import React from 'react';
import { observer } from 'mobx-react';
import * as d3 from "d3"

import { IPoint, TPointGroups } from 'modules/Type'
import { getColorByName, getTextWidth, cropText, summarizeDomain } from 'modules/UtilityClasses'
import { computed } from 'mobx';

import { IImportantScore } from './index'

import { Tooltip } from 'antd'


interface Props {
    points: IPoint[],
    importanceScores: IImportantScore[],
    stateLabels: { [key: string]: string },
    width: number,
    height: number,
    hoverPointID: number,
    pointGroups: TPointGroups,
    colorScales: Array<(value: string | number | boolean) => string>,
    sampleFeatureDomains: (string|number|boolean)[][],
    setHoverID: (id: number) => void,
    resetHoverID: () => void,
    removeVariable: (name: string) => void,
}


@observer
class StateBlock extends React.Component<Props> {
    public horizonGap = 15;
    maxCellHeight = 20;
    verticalGap = 10;
    fontHeight = 15;
    strokeW = 1;
    cellVerticalGap = 25;
    binNum =8;
    blockHeightRatio = 0.5; // the heigh of block : the height of whole chart 
    maxNameColRatio = 0.15; // the max width of feature name col / the width of the state identification panel
    nameChartGap = 20; // the horizontal distance between feature name col and state charts
    scoreDigits = 2;
    rightMargin = 5;

    constructor(props: Props) {
        super(props)
        this.drawAllStates = this.drawAllStates.bind(this)
        this.drawOneState = this.drawOneState.bind(this)
        this.drawTimeDist = this.drawTimeDist.bind(this)

    }
    @computed
    get maxNameColWidth(){
        return this.props.width * this.maxNameColRatio
    }

    @computed
    get nameColWidth(): number {

        // let scoreWidth = getTextWidth((0.000).toFixed(this.scoreDigits) + '  X', this.fontHeight)
        let scoreWidth = getTextWidth('  X', this.fontHeight)
        let nameWidth = Math.max(...this.props.importanceScores.map(
            d => getTextWidth(d['name'], this.fontHeight)
        ))
        nameWidth = Math.min(nameWidth, this.maxNameColWidth)

        return scoreWidth + nameWidth 
    }

    @computed
    get wholeHorizonGap(): number {
        let { pointGroups, points } = this.props
        let allSelected = Object.values(pointGroups).map(d => d.pointIdx).flat()

        let hasLeftPoints = allSelected.length < points.length
        // let wholeHorizonGap = (hasLeftPoints ? Object.keys(pointGroups).length : Object.keys(pointGroups).length - 1) * (this.horizonGap+2*this.cellVerticalGap)  + 2*this.cellVerticalGap
        let wholeHorizonGap = (hasLeftPoints ? Object.keys(pointGroups).length : Object.keys(pointGroups).length - 1) * this.horizonGap + 2 * this.cellVerticalGap
        return wholeHorizonGap
    }
    // @computed
    // get cellWidth(): number {
    //     let { width, points } = this.props
    //     let cellWidth = (width - this.nameColWidth - this.wholeHorizonGap - this.rightMargin) / points.length
    //     return cellWidth
    // }

    @computed
    get blockWidth(): number {
        let { width, pointGroups } = this.props
        let blockWidth = (width - this.nameColWidth - this.wholeHorizonGap - this.rightMargin) / Object.keys(pointGroups).length
        return blockWidth
    }

    @computed
    get attrNum(): number {
        let { points } = this.props
        let attrNum = points[0].value.length
        return attrNum
    }

    @computed
    get cellHeight(): number {
        let { height } = this.props
        let attrNum = this.attrNum
        let cellHeight = (height - this.fontHeight - this.verticalGap) * this.blockHeightRatio / attrNum - this.strokeW - this.cellVerticalGap

        return cellHeight
    }

    @computed
    get maxTimeIdx(): number {
        let { points, height } = this.props
        let maxTimeIdx = Math.max(...points.map(p => p.timeIdx))
        return maxTimeIdx
    }

    @computed
    get timeStepHeight(): number {
        let { points, height } = this.props

        const timeStepHeight = (height - this.fontHeight - this.verticalGap) * (1 - this.blockHeightRatio) / (this.maxTimeIdx + 1)

        return timeStepHeight
    }

    @computed
    get cellYScale(){
        let {sampleFeatureDomains, points, pointGroups} = this.props

        let scales:d3.ScaleLinear<number, number>[] = []
        sampleFeatureDomains.forEach((featureDomain, rowIdx)=>{
            let scale = d3.scaleLinear()
            let values = points.map(p=>p.value[rowIdx])
            let valueMax = -Infinity,valueMin = Infinity
            if (typeof(values[0]) == 'number'){
                 let valueGap = ((featureDomain[1] as number) - (featureDomain[0] as number))/this.binNum

                 for (let i=0;i<this.binNum;i++){
                     

                    Object.keys(pointGroups).forEach(statekey=>{
                        let {pointIdx} = pointGroups[statekey]
                        let binValue = pointIdx.map(idx=>points[idx].value[rowIdx])
                        .filter(d=>{
                            if (i==this.binNum-1){
                                return (featureDomain[0] as number +valueGap*i)<=d && d<=(featureDomain[0] as number + valueGap*(i+1) )
                            } else return (featureDomain[0] as number +valueGap*i)<=d && d<(featureDomain[0] as number + valueGap*(i+1) )
                        })
                        .length
                        
                        valueMax = Math.max(binValue, valueMax)
                        if (binValue>0) {
                            valueMin = Math.min(binValue, valueMin)
                        }
                    })
                    
                    
                 }
            }else {

                for (let i=0;i<featureDomain.length;i++){
                    Object.keys(pointGroups).forEach(statekey=>{
                        let {pointIdx} = pointGroups[statekey]
                        let binValue =pointIdx
                            .map(idx=>points[idx].value[rowIdx])
                            .filter(d=>d==featureDomain[i])
                            .length
                   
                        valueMax = Math.max(binValue, valueMax)
                        
                        valueMin = Math.min(binValue, valueMin)
                        
                    })
                }
            }

            if (valueMax > 20*valueMin){
                // so that the bin with min value will not be too short
                scale.range([this.cellHeight*0.1, this.cellHeight])
                scale.domain([valueMin, valueMax])
            }else{
                scale.range([0, this.cellHeight])
                scale.domain([0, valueMax])
            }
            

            scales.push(scale)
        })
        return scales
    }

    drawAllStates() {
        let { points, pointGroups, stateLabels, height } = this.props
        if (points.length === 0) return <g />

        let offsetX = 0

        let stateBlocks: JSX.Element[] = []
        let allSelected = Object.values(pointGroups).map(d => d.pointIdx).flat()
        let hasLeftPoints = allSelected.length < points.length

        let fontHeight = this.fontHeight

        if (Object.keys(pointGroups).length > 0) {


            Object.values(pointGroups).forEach(g => {
                let { stateKey, pointIdx } = g
                let stateColor = getColorByName(stateKey)
                let stateName = stateLabels[stateKey] || stateKey

                stateBlocks.push(
                    <g key={stateKey} className={`state${stateKey}`} transform={`translate(${offsetX}, 0)`}>

                        <rect fill={stateColor} className='labelBG'
                            width={Math.max(getTextWidth(stateName, 14), 20)} height={fontHeight}
                            opacity={0.5}
                            stroke={stateColor}
                        />
                        <text alignmentBaseline="hanging">{stateName}</text>

                        

                        <g transform={`translate(0, ${fontHeight})`} className='oneState' >
                            {this.drawOneState(pointIdx.map(id => points[id]), stateKey)}
                        </g>

                    </g>)

                offsetX += this.blockWidth + this.horizonGap
            })


            if (hasLeftPoints) {
                let leftNodes = points.map((_, i) => i)
                    .filter(i => !allSelected.includes(i))

                stateBlocks.push(
                    <g key={'undefined'} className={`undefined`} transform={`translate(${offsetX}, 0)`}>
                        <text alignmentBaseline="hanging">undefined</text>
                        <g transform={`translate(0, ${fontHeight})`} className='oneState'>
                            {this.drawOneState(leftNodes.map(id => points[id]), 'undefined')}
                        </g>
                    </g>)
            }

        } else {
            //if no pointGroups states, treat all points at one state
            stateBlocks.push(
                <g key='undefined' className={`undefined`} transform={`translate(${offsetX}, 0)`}>
                    <text alignmentBaseline="hanging">undefined</text>
                    <g transform={`translate(0, ${fontHeight})`} className='onsState'>
                        {this.drawOneState(points, 'undefined')}
                    </g>
                </g>
            )
        }

        let allStates = <g className='state' key='allStates' transform={`translate(${this.nameColWidth + this.nameChartGap}, 0)`}>
            {stateBlocks}
        </g>

        let featureNameRows = this.featureNameRows()
        let timeDistLabelWidth = getTextWidth('Distribution', this.fontHeight) + 10

        let timeDistLabel = <g
            className="timeDistLable labelButton"
            key="timeDistLable"
            transform={`translate(${this.nameColWidth / 2}, ${this.attrNum * (this.cellHeight + this.cellVerticalGap) + this.fontHeight + this.verticalGap + this.maxTimeIdx * this.timeStepHeight}) rotate(-90 0 0)`}
        >
            <rect
                width={timeDistLabelWidth} height={this.fontHeight * 2.2}
                rx="3"
                stroke="gray"
                fill="white"
            />
            <text y={this.fontHeight} textAnchor="middle" x={timeDistLabelWidth/2}>
                Temporal 
            </text>
            <text y={2*this.fontHeight} textAnchor="middle" x={timeDistLabelWidth/2}>
                Distribution 
            </text>
        </g>

        return [featureNameRows, timeDistLabel, allStates]
    }

    // draw the block of one state
    drawOneState(points: IPoint[], stateKey: string) {
        if (points.length == 0) {
            return []
        }


        let block = this.drawBlock(points, stateKey)

        let timeDist = this.drawTimeDist(points, stateKey)

        return [block, timeDist]

    }

    drawCellDist(values: string[]|number[]|boolean[], rowIdx:number, color:string){
        let {sampleFeatureDomains} = this.props
        let featureDomain = sampleFeatureDomains[rowIdx], yScale = this.cellYScale[rowIdx]
        if (typeof (values[0])=='number'){
            let valueGap = ((featureDomain[1] as number) - (featureDomain[0] as number))/this.binNum
            let binHeights:number[] = []
            for (let i=0;i<this.binNum;i++){
                let binValue =(values as number[]).filter(d=>{
                    return (featureDomain[0] as number +valueGap*i)<=d && d<(featureDomain[0] as number+valueGap* (i+1))
                }).length
                if (binValue==0){
                    binHeights.push(0)
                }else{
                    binHeights.push(yScale(binValue))
                }
            }
            let binWidth=this.blockWidth/this.binNum

            return binHeights.map((binHeight, binIdx)=>{

                return <rect 
                    key={`bin_${binIdx}`}
                    width={binWidth} 
                    height={binHeight}
                    x={binWidth*binIdx}
                    y={this.cellHeight - binHeight}
                    fill={color}
                />
            })
        }else{
            let barCounts = featureDomain.map(_=>0)
            values.forEach((v:string|boolean|number)=>{
                let idx = featureDomain.indexOf(v)
                barCounts[idx] += 1
            })
            let binWidth = this.blockWidth/featureDomain.length

            return barCounts.map((barCount, binIdx)=>{
                let binHeight = yScale(barCount)
                if (barCount=0) {
                    binHeight = 0
                }
                return <rect 
                    key={`bin_${binIdx}_${featureDomain[binIdx]}`}
                    width={binWidth} 
                    height={binHeight}
                    x={binWidth*binIdx}
                    y={this.cellHeight - binHeight}
                    fill={color}
                />
            })
        }
    }

    drawBlock(points: IPoint[], stateKey: string) {
        let stateColor = getColorByName(stateKey)
        points = this.reorderPoints(points)
        let { setHoverID, resetHoverID, sampleFeatureDomains } = this.props
        if (points.length==0) return <g key="block" className="block" />
        let rows = sampleFeatureDomains.map((domain,rowIdx)=>{
            let values = points.map(p=>p.value[rowIdx])
            let getRectHeight : (domain:any[], value:any)=>number, getRectY : (domain:any[], value:any)=>number, 
                domainTextArr = summarizeDomain(values.filter(v=>v!==undefined) as number[]|string[]|boolean[]),
                cellText:string, cellTextFull:string

            //crop domain text
            let domainTextArrCroped = domainTextArr.map(d=>cropText(d, this.fontHeight, 700, this.blockWidth/domainTextArr.length))

            if (typeof (domain[0]) ==='number' ){
                getRectHeight = (domain:any[], value:any):number=>(value-domain[0])/(domain[1]-domain[0])*this.cellHeight 
                getRectY = (domain:any[], value:any):number=>this.cellHeight - (value-domain[0])/(domain[1]-domain[0])*this.cellHeight 
                cellText = domainTextArrCroped.join('~')
                cellTextFull = domainTextArr.join('~')
                
            }else{
                getRectHeight = (domain:any[], value:any):number=>1/domain.length*this.cellHeight
                getRectY = (domain:any[], value:any):number=>domain.indexOf(value)/domain.length*this.cellHeight
                cellText = domainTextArrCroped.join(', ')
                cellTextFull = domainTextArr.join(',')
            }
            

            let row = this.drawCellDist(
                points.map(d=>d.value[rowIdx]) as number[]|string[]|boolean[], 
                rowIdx, 
                stateColor
            )

            return <Tooltip title={cellTextFull} key={`row_${rowIdx}`} destroyTooltipOnHide>
                <g key={`row_${rowIdx}`} className={`row_${rowIdx}`} transform={`translate(${0}, ${(this.cellHeight + this.cellVerticalGap)* rowIdx })`}>
                 <line className='rowBG'
                    fill='none'
                    stroke='gray'
                    strokeWidth={this.strokeW}
                    y1={ this.cellHeight + this.strokeW/2} 
                    y2={ this.cellHeight + this.strokeW/2} 
                    x1={0}
                    x2={this.blockWidth }
                />
                <g key="cellDist" className='cellDist'>
                    {row}
                </g>
                <text y={this.cellHeight + this.strokeW + this.fontHeight}>
                    {cellText}
                </text>
            </g>
            </Tooltip>
        })

        return <g key="block" className="block"> {rows} </g>

    }

    // draw the time dist of one identified state
    drawTimeDist(points: IPoint[], stateKey: string) {

        let dist = [...Array(this.maxTimeIdx + 1)].map(d => 0)
        points.forEach(point => {
            let timeIdx = point.timeIdx
            dist[timeIdx] += 1
        })

        // let charPoints = dist.map((d,i)=>`L ${d*this.cellWidth} ${i * this.timeStepHeight}`)
        // return <g className='timeDist' key="timeDist" transform={`translate(0, ${this.cellHeight * this.attrNum + this.verticalGap})`}>
        //     <path 
        //         d= {`M 0 0 ${charPoints.join(' ')} L ${0} ${this.maxTimeIdx* this.timeStepHeight} z`}
        //         fill='lightgray'
        //         stroke = 'lightgray'
        //         strokeWidth = '2'
        //     />
        // </g>


        var lineGene = d3.line().curve(d3.curveMonotoneY);
        let pathString = lineGene(
            dist.map(
                (d, i) => [d * this.blockWidth/points.length, i * this.timeStepHeight]
            )
        )

        pathString = `${pathString} L ${0} ${this.maxTimeIdx * this.timeStepHeight} L ${0} ${0} z`
        let color = getColorByName(stateKey)
        return <g className='timeDist' key="timeDist" transform={`translate(0, ${ (this.cellHeight + this.cellVerticalGap) * this.attrNum + this.verticalGap})`}>
            <path
                d={pathString as string}
                fill={color}
                stroke={color}
                strokeWidth='2'
            />
        </g>

    }
    
    featureNameRows() {
        let { importanceScores, width } = this.props
        let rows = importanceScores.map((d, i) => {
            let { score, name } = d
            let cropName = cropText(name, 12, 400, this.maxNameColWidth)
            let featureNameComponent = cropName.length === name.length ?
                <g opacity={Math.max(0.3, score)} cursor="pointer" className="feature name">
                    <text >
                        {cropName} 
                    </text>
                    <text y={12}>{score.toFixed(this.scoreDigits)}</text>
                </g>
                : <Tooltip title={name}>
                    <g opacity={Math.max(0.3, score)} cursor="pointer" className="feature name">
                    <text >
                        {cropName} 
                    </text>
                    <text y={12}>{score.toFixed(this.scoreDigits)}</text>
                </g>
                </Tooltip>
                
            return <g key={name} transform={`translate(0, ${ (this.cellHeight+this.cellVerticalGap) * (i + 0.8)})`}>
                {featureNameComponent}
                <text
                    x={this.nameColWidth } textAnchor="end" cursor="pointer"
                    onClick={() => { this.props.removeVariable(name) }}
                >
                    X
            </text>

            </g>
        })

        let impLable = 'scores', impLableWidth = getTextWidth(impLable, this.fontHeight) + 10
        return <g className='importanceScores labelButton' transform={`translate(${0}, ${this.fontHeight - this.cellVerticalGap})`} key='importanceScores'>

            <rect width={impLableWidth} height={this.fontHeight * 1.2} rx={3}
                x={this.nameColWidth / 2 - impLableWidth / 2}
                y={-this.fontHeight}
                fill="white" stroke="gray"
            />
            <text x={this.nameColWidth / 2} textAnchor="middle">
                {impLable}
            </text>
            {rows}
        </g>
    }


    reorderPoints(points: IPoint[]) {
        return [...points].sort((a, b) => {
            let dif = 0
            for (let i = 0; i < a.value.length; i++) {
                if (a.value[i] !== b.value[i]) {
                    dif = a.value[i] > b.value[i] ? 1 : -1
                    break
                }
            }
            return dif
        })
    }

    render() {
        // let legendLabelTransform = `translate(${this.props.width - this.rightMargin * 0.5}, ${this.cellHeight * this.attrNum / 2 + this.fontHeight}) rotate(-90, 0, 0) `
        // let legendLabelWidth = getTextWidth('legend V', this.fontHeight)+20, legendLabelHeight = this.fontHeight * 1.3
        return <svg className='stateSummary' width="100%" height={`${this.props.height}px`}> <g className='stateSummary' key='stateSummary'>
            {this.drawAllStates()}
        </g>
        </svg>
    }
}



export default StateBlock;