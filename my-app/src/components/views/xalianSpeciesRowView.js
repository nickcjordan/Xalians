import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import XalianImage from '../xalianImage';
import XalianStatRatingChart from '../xalianStatRatingChart';
import XalianMoveSet from '../xalianMoveSet';
import * as valueTranslator from '../../utils/valueTranslator';
import XalianInfoBox from '../xalianInfoBox';

class XalianSpeciesRowView extends React.Component {
	state = {};

	render() {
		return (
			<div className="xalian-stat-row-view-wrapper vertically-center-contents stackable-margin">
				<Row style={{ width: '100%' }} >
					<Col className='vertically-center-contents' xs={12} sm={6} lg={4}>
                        <XalianInfoBox species={this.props.species}/>
                    </Col>
					<Col className='vertically-center-contents' xs={12} sm={6} lg={4}>
						<XalianImage colored shadowed speciesName={this.props.species.name} primaryType={this.props.species.type} moreClasses="xalian-image-in-row centered-div" />
					</Col>
					<Col className='vertically-center-contents' xs={12} sm={12} lg={4}>
						<XalianStatRatingChart axisLabelColor={'white'} includeLabel labelFontSize={'8pt'} barSize={20} stats={this.props.species.statRatings} abbreviatedNames moreClasses='ultra-condensed-chart-div'/>
					</Col>
				</Row>
				
			</div>
		);
	}
}

export default XalianSpeciesRowView;
