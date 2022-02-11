import React, { PureComponent } from "react";
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const d = [];

class CharacterGeneratedStatChart extends React.Component {
  state = {
    isLoaded: false,
  };

  componentDidMount() {
    // setTimeout(() => {
    //     this.setState({ isLoaded: true });
    // }, 2000);
  }

  componentDidUpdate() {}

  setupData = (x) => {
    if (!x) {
      return [];
    }
    let transMap = new Map();
    transMap["standardAttackRating"] = "Attack";
    transMap["specialAttackRating"] = "Sp. Attack";
    transMap["standardDefenseRating"] = "Defense";
    transMap["specialDefenseRating"] = "Sp. Defense";
    transMap["speedRating"] = "Speed";
    transMap["evasionRating"] = "Evasion";
    transMap["staminaRating"] = "Stamina";
    transMap["recoveryRating"] = "Recovery";

    transMap["standardAttackPoints"] = "Standard Attack";
    transMap["specialAttackPoints"] = "Special Attack";
    transMap["standardDefensePoints"] = "Standard Defense";
    transMap["specialDefensePoints"] = "Special Defense";
    transMap["speedPoints"] = "Speed";
    transMap["evasionPoints"] = "Evasion";
    transMap["staminaPoints"] = "Stamina";
    transMap["recoveryPoints"] = "Recovery";

    transMap["low"] = "Low";
    transMap["medium"] = "Medium";
    transMap["high"] = "High";

    let valMap = new Map();
    valMap["low"] = 1;
    valMap["medium"] = 2;
    valMap["high"] = 3;

    var dataSet = [];
    for (var key in x.stats) {
      let stat = x.stats[key];
      let translated = transMap[key];
      let rangeVal = parseInt(valMap[stat.range]) * 250;
      if (translated) {
        dataSet.push({
          statName: key,
          statLabel: transMap[key],
          rangeName: transMap[stat.range],
          rangeNumber: rangeVal,
          points: stat.points,
          percentageText: stat.points + " Points, " + stat.percentage + "%",
        });
      }
    }
    // this.setState({ data: dataSet });
    return dataSet;
  };

  render() {
    return (
      <div class="expanded-chart-div centered-view">
        {this.props.xalian && (
          <ResponsiveContainer className="chart-container centered-view">
            <BarChart data={this.setupData(this.props.xalian)} layout="vertical" maxBarSize={35}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="statLabel" stroke="#80ffb1" />
              {/* <Tooltip cursor={false}/> */}

              <Bar isAnimationActive={false} animationBegin={50} dataKey="rangeNumber" fill="#ecff8234">
                <LabelList dataKey="rangeName" position="center" fill="white" className="chart-bar-label" id="stat-bar-label" />
              </Bar>
              <Bar isAnimationActive={false} animationBegin={50} dataKey="points" fill="#80dbff34">
                <LabelList dataKey="percentageText" position="center" fill="white" className="chart-bar-label" id="stat-bar-label" />
              </Bar>
              {/* <Bar dataKey="percentage" fill="#80dbff34" >
                            <LabelList dataKey="percentage" position="center" fill="white" className="chart-bar-label" id="stat-bar-label"/>
                        </Bar> */}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }
}

export default CharacterGeneratedStatChart;
