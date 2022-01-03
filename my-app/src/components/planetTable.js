import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class PlanetTable extends React.Component {

  buildRow(key, val) {
    return <tr>
      <th scope="row">{key}:</th>
      <td>{val}</td>
    </tr>
  }

  getTitle() {
    return <h4>{this.props.title}</h4>
  }

  render() {
    let list = [];
    for (const key in this.props.data) {
      let val = this.props.data[key];
      list.push(this.buildRow(key, val));
    }
    return <React.Fragment>

      {this.props.title && this.getTitle()}

      <table class="planet-table">
        <tbody>
          {list}
        </tbody>
      </table>

    </React.Fragment>;
  }




}

export default PlanetTable;



// buildRow(val) {
//   return  <tr>
//               <td>{this.translateStatName(val.name)}</td>
//               <td>{val.range}</td>
//               <td>{val.points}</td>
//               <td>{val.percentage}%</td>
//           </tr>
// }

// render() {
//   let list = [];
//   for (const key in this.props.stats) {
//       let val = this.props.stats[key];
//       list.push(this.buildRow(val));
//   }

//   // return <Table striped bordered hover variant="dark" size="sm" className="stat-table">
//   return <Table hover variant="dark" bordered size="sm" className="stat-table">
//       <thead>
//           <tr>
//               <th>Stat</th>
//               <th>Range</th>
//               <th>Points</th>
//               <th>Result</th>
//           </tr>
//       </thead>
//       <tbody>
//           {list}
//       </tbody>
//   </Table>;
// }