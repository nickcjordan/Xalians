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
import { ReactComponent as SVG } from './xalian.svg';
import FigzyAnimatedSVG from '../../svg/figzyAnimatedSVG';

class ThemedSceneDiv extends React.Component {
	state = {};

	render() {
		return (
			<React.Fragment>
				<Row className="themed-scene-div-wrapper">
					{/* <SVG fill="rgba(0, 0, 0, 0.7)" className="section-top-scene" ></SVG> */}

					<Row className="vertically-center-contents stackable-margin themed-scene-div-content-wrapper">{this.props.children}</Row>
				</Row>
			</React.Fragment>
		);
	}
}

export default ThemedSceneDiv;
