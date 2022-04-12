import React, { PureComponent, lazy } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import XalianImage from '../xalianImage';
import XalianMoveSet from '../xalianMoveSet';
import * as valueTranslator from '../../utils/valueTranslator';
import XalianInfoBox from '../xalianInfoBox';

import XalianStatChart from '../xalianStatChart';
// const XalianStatChart = lazy(() => import('../xalianStatChart'));


class XalianStatRowView extends React.Component {
	state = {};

	callAccountPageCallback = () => {
		this.props.accountPageCallback(this.props.xalian);
	};

	render() {
		let x = this.props.xalian.attributes;

		return (
			<div className="xalian-stat-row-view-wrapper vertically-center-contents stackable-margin">
				<Row>
					<Col className="vertically-center-contents centered-view" xs={6} lg={3}>
						{this.props.accountPage && (
							<Col className="vertically-center-contents" lg={1}>
								<Button className="delete-button" variant="danger" onClick={this.callAccountPageCallback}>
									<i class="bi bi-trash"></i>
								</Button>
							</Col>
						)}
						<Col className="vertically-center-contents" lg={true}>
							<XalianInfoBox xalian={x} />
						</Col>
					</Col>
					<Col className="vertically-center-contents" xs={6} lg={2}>
						<XalianImage colored shadowed speciesName={x.species.name} primaryType={x.elements.primaryType} secondaryType={x.elements.secondaryType} moreClasses="xalian-image-in-row" />
					</Col>
					<Col className="vertically-center-contents" lg={4}>
						<XalianStatChart axisLabelColor={'white'} includeLabel labelFontSize={'8pt'} barSize={20} stats={x.stats} abbreviatedNames moreClasses="condensed-chart-div" />
					</Col>
					<Col className="vertically-center-contents" lg={true}>
						<XalianMoveSet moves={x.moves}></XalianMoveSet>
					</Col>
				</Row>
			</div>
		);
	}
}

export default XalianStatRowView;
