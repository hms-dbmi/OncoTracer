import React from 'react';
import {observer} from 'mobx-react';
import uuidv4 from 'uuid/v4';

/*
implements the legend on the right side of the main view
 */
const Legend = observer(class Legend extends React.Component {
    constructor() {
        super();
        this.maxWidth = 0;
        this.borderLeft = 10;
    }

    /**
     * gets a single entry of the legend
     * @param value: text to display
     * @param opacity: 1 if primary, lower for secondary
     * @param rectWidth
     * @param fontSize
     * @param currX: current x position
     * @param lineheight
     * @param rectColor
     * @param textColor
     * @param tooltipText
     * @returns [] legendEntry
     */
    getLegendEntry(value, opacity, rectWidth, fontSize, currX, lineheight, rectColor, textColor, tooltipText) {
        return <g key={value} onMouseEnter={(e) => {
            this.props.showTooltip(e, tooltipText);
        }} onMouseLeave={this.props.hideTooltip}>
            <rect opacity={opacity} width={rectWidth} height={fontSize + 2}
                  x={currX} y={lineheight / 2 - fontSize / 2}
                  fill={rectColor}
            />
            <text fill={textColor} style={{fontSize: fontSize}} x={currX + 2}
                  y={lineheight / 2 + fontSize / 2}>{value}</text>
        </g>;
    }

    /**
     * computes the width of a text. Returns 30 if the text width would be shorter than 30
     * @param min
     * @param text
     * @param fontSize
     * @returns {number}
     */
    static getTextWidth(min, text, fontSize) {
        const context = document.createElement("canvas").getContext("2d");
        context.font = fontSize + "px Arial";
        const width = context.measureText(text).width;
        if (width > min) {
            return width;
        }
        else return min;
    }

    updateMaxWidth(width) {
        if (width > this.maxWidth) {
            this.maxWidth = width;
        }
    }

    /**
     * gets a legend for a continuous variable
     * @param opacity
     * @param fontSize
     * @param lineheight
     * @param color
     * @returns {Array}
     */
    getContinuousLegend(opacity, fontSize, lineheight, color) {
        const min = color.domain()[0];
        const max = color.domain()[color.domain().length - 1];
        let intermediateStop = null;
        let text = [];
        if (color.domain().length === 3) {
            intermediateStop = <stop offset="50%" style={{stopColor: color(color.domain()[1])}}/>;
            text.push(<text key={"text" + min} fill="white" style={{fontSize: fontSize}} x={0}
                            y={lineheight / 2 + fontSize / 2}>{Math.round(min * 100) / 100}</text>,
                <text key={"text" + 0} fill="black" style={{fontSize: fontSize}}
                      x={50 - Legend.getTextWidth(0, 0, fontSize) / 2}
                      y={lineheight / 2 + fontSize / 2}>{0}</text>,
                <text key={"text" + max} fill="white" style={{fontSize: fontSize}}
                      x={100 - Legend.getTextWidth(0, Math.round(max * 100) / 100, fontSize)}
                      y={lineheight / 2 + fontSize / 2}>{Math.round(max * 100) / 100}</text>)
        }
        else {
            text.push(<text key={"text" + min} fill="black" style={{fontSize: fontSize}} x={0}
                            y={lineheight / 2 + fontSize / 2}>{Math.round(min * 100) / 100}</text>,
                <text key={"text" + max} fill="white" style={{fontSize: fontSize}}
                      x={100 - Legend.getTextWidth(0, Math.round(max * 100) / 100, fontSize)}
                      y={lineheight / 2 + fontSize / 2}>{Math.round(max * 100) / 100}</text>)
        }
        let randomId = uuidv4();
        this.updateMaxWidth(100 + this.borderLeft);
        return <g transform={"translate(" + this.borderLeft + ",0)"}>
            <defs>
                <linearGradient id={randomId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor: color(min)}}/>
                    {intermediateStop}
                    <stop offset="100%" style={{stopColor: color(max)}}/>
                </linearGradient>
            </defs>
            <rect opacity={opacity} x="0" y="0" width={100} height={lineheight} fill={"url(#" + randomId + ")"}/>
            {text}
        </g>;
    }

    /**
     * gets a legend for a categorical variable
     * @param row
     * @param opacity
     * @param fontSize
     * @param lineheight
     * @param color
     * @returns {Array}
     */
    getCategoricalLegend(row, opacity, fontSize, lineheight, color) {
        const _self = this;
        let currX = this.borderLeft;
        let currKeys = [];
        let legendEntries = [];
        //change
        row.forEach(function (f) {
            if (!currKeys.includes(f) && f !== undefined) {
                const rectWidth = Legend.getTextWidth(30, f, fontSize) + 4;
                currKeys.push(f);
                legendEntries = legendEntries.concat(_self.getLegendEntry(f.toString(), opacity, rectWidth, fontSize, currX, lineheight, color(f), "black", f));
                currX += (rectWidth + 2);
            }
        });
        this.updateMaxWidth(currX);
        return legendEntries;
    }

    getBinnedLegend(opacity, fontSize, lineheight, color, modification) {
        let legendEntries = [];
        const _self = this;
        let currX = this.borderLeft;
        color.domain().forEach(function (d, i) {
            let rgb = color.range()[i].replace(/[^\d,]/g, '').split(',');
            let brightness = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
            let textColor;
            if (brightness < 255 / 2) {
                textColor = "white";
            }
            else {
                textColor = "black";
            }
            const rectWidth = Legend.getTextWidth(30, d, fontSize) + 4;
            const tooltipText = d + ": " + modification.bins[i] + " to " + modification.bins[i + 1];
            legendEntries = legendEntries.concat(_self.getLegendEntry(d, opacity, rectWidth, fontSize, currX, lineheight, color(d), textColor, tooltipText));
            currX += (rectWidth + 2);
        });
        this.updateMaxWidth(currX);
        return legendEntries;
    }

    /**
     * gets a legend for a binary variable
     * @param opacity
     * @param fontSize
     * @param lineheight
     * @param color
     * @returns {Array}
     */
    getBinaryLegend(opacity, fontSize, lineheight, color) {
        let _self = this;
        let legendEntries = [];
        legendEntries = legendEntries.concat(_self.getLegendEntry("true", opacity, Legend.getTextWidth(30, "true", fontSize) + 4, fontSize, this.borderLeft, lineheight, color(true), "black", "true"));
        legendEntries = legendEntries.concat(_self.getLegendEntry("false", opacity, Legend.getTextWidth(30, "false", fontSize) + 4, fontSize, this.borderLeft + Legend.getTextWidth(30, "true", fontSize) + 6, lineheight, color(false), "black", "true"));
        this.updateMaxWidth(74);
        return (legendEntries);
    }

    getHighlightRect(height) {
        return <rect height={height} width={this.maxWidth} fill="lightgray"/>
    }

    /**
     * gets the legend
     * @param data
     * @param primary
     * @param fontSize
     * @param currentVariables
     * @returns {Array}
     */
    getBlockLegend(data, primary, fontSize, currentVariables) {
        const _self = this;
        let legend = [];
        let currPos = 0;

        if (!this.props.store.globalTime) {
            if (data.length !== undefined) {
                data.forEach(function (d, i) {
                    if (!d.isUndef || _self.props.store.showUndefined || primary === d.variable) {
                        let lineheight;
                        let opacity = 1;
                        if (primary === d.variable) {
                            lineheight = _self.props.visMap.primaryHeight;
                        }
                        else {
                            lineheight = _self.props.visMap.secondaryHeight;
                            opacity = 0.5
                        }
                        let color = currentVariables[i].colorScale;
                        let legendEntries = [];
                        if (lineheight < fontSize) {
                            fontSize = Math.round(lineheight);
                        }
                        if (currentVariables[i].datatype === "STRING") {
                            legendEntries = _self.getCategoricalLegend(d.data.map(element => element.value), opacity, fontSize, lineheight, color);
                        }
                        else if (currentVariables[i].datatype === "binary") {
                            legendEntries = _self.getBinaryLegend(opacity, fontSize, lineheight, color);
                        }
                        else if (currentVariables[i].datatype === "BINNED") {
                            legendEntries = _self.getBinnedLegend(opacity, fontSize, lineheight, color, currentVariables[i].modification);
                        }
                        else {
                            legendEntries = _self.getContinuousLegend(opacity, fontSize, lineheight, color);
                        }
                        const transform = "translate(0," + currPos + ")";
                        currPos += lineheight + _self.props.visMap.gap;
                        let highlightRect = null;
                        if (d.variable === _self.props.highlightedVariable) {
                            highlightRect = _self.getHighlightRect(lineheight)
                        }
                        legend.push(<g key={d.variable} transform={transform}>{highlightRect}{legendEntries}</g>)
                    }
                });
            }
        }
        return legend
    }

    getGlobalLegend(fontSize, primaryVariable) {
        let legend;
        const _self = this;
        if (primaryVariable.datatype === "STRING") {
            let allValues = [];
            this.props.timepoints.forEach(function (d) {
                d.heatmap.forEach(function (f) {
                    if (f.variable === _self.props.store.rootStore.globalPrimary) {
                        allValues = allValues.concat(f.data.map(element => element.value));
                    }
                })
            });
            legend = this.getCategoricalLegend(allValues, 1, fontSize, this.props.visMap.primaryHeight, primaryVariable.colorScale);
        }
        else if (primaryVariable.datatype === "binary") {
            legend = this.getBinaryLegend(1, fontSize, this.props.visMap.primaryHeight, primaryVariable.colorScale);
        }
        else if (primaryVariable.datatype === "BINNED") {
            legend = this.getBinnedLegend(1, fontSize, this.props.visMap.primaryHeight, primaryVariable.colorScale, primaryVariable.modification);
        }
        else {
            legend = this.getContinuousLegend(1, fontSize, this.props.visMap.primaryHeight, primaryVariable.colorScale);
        }
        return legend;
    }


    render() {
        const textHeight = 10;
        const _self = this;
        let legends = [];

        let transform = "";
        if (!this.props.store.globalTime) {
            transform = "translate(0," + 20 + ")";
            this.props.timepoints.forEach(function (d, i) {
                let transform = "translate(0," + _self.props.posY[i] + ")";

                const lg = _self.getBlockLegend(d.heatmap, d.primaryVariableId, textHeight, _self.props.currentVariables[d.type]);

                legends.push(<g key={i + d}
                                transform={transform}
                >
                    {lg}
                </g>);

            });
        }
        else {
            //let primaryVariable = this.props.store.variableStore["sample"].currentVariables.filter(variable => variable.id === _self.props.store.rootStore.globalPrimary)[0];

            let primaryVariable = this.props.currentVariables.sample.filter(variable => variable.originalIds[0] === _self.props.store.rootStore.globalPrimary)[0];
            legends = this.getGlobalLegend(textHeight, primaryVariable);
        }
        return (
            <div className="scrollableX">
                <svg width={this.maxWidth} height={this.props.height}>
                    <g transform={transform}>
                        {legends}
                    </g>
                </svg>
            </div>
        )
    }
});
export default Legend;
