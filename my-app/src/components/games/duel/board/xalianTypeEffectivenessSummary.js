import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import XalianSpeciesBadge from '../../../xalianSpeciesBadge';
import typeEffectivenessMatrix from '../../../../json/typeEffectivenessMatrix.json';
import species from '../../../../json/species.json';

class XalianTypeEffectivenessSummary extends React.Component {

	render() {

        var ranges = new Map();
        var map = null;
        Object.keys(typeEffectivenessMatrix).forEach(key => {
			if (key.toLowerCase() === this.props.type.toLowerCase()) {
				map = typeEffectivenessMatrix[key];
			}
		});

      
        var noEffectTypes = [];
        var lowEffectTypes = [];
        var mediumEffectTypes = [];
        var highEffectTypes = [];
        var superEffectTypes = [];

        if (map) {
            Object.keys(map).forEach(key => {
                let val = map[key];
                let badge = <XalianSpeciesBadge key={key.toLowerCase()} hideName type={key.toLowerCase()} />;
                if (val == 0) { noEffectTypes.push(badge); }
                if (val == 0.5) { lowEffectTypes.push(badge); }
                if (val == 1) { mediumEffectTypes.push(badge); }
                if (val == 1.5) { highEffectTypes.push(badge); }
                if (val == 2) { superEffectTypes.push(badge); }
            });
        }

        
		return (
			<React.Fragment>
				
					<Col className="" xs={true}>
						<Stack>
                            <span className="duel-effect-column-label">2X</span>
                            {superEffectTypes}
						</Stack>
					</Col>

                    <Col className="" xs={true}>
						<Stack>
                            <span className="duel-effect-column-label">Great</span>
                            {highEffectTypes}
						</Stack>
					</Col>
 
                    {/* <Col className="" xs={true}>
						<Stack>
                        <span className="duel-effect-column-label">Normal</span>
                            {mediumEffectTypes}
						</Stack>
					</Col>  */}

                    <Col className="" xs={true}>
						<Stack>
                            <span className="duel-effect-column-label">Low</span>
                            {lowEffectTypes}
						</Stack>
					</Col>

                    <Col className="" xs={true}>
						<Stack>
                            <span className="duel-effect-column-label">Immune</span>
                            {noEffectTypes}
						</Stack>
					</Col>

			</React.Fragment>
		);
	}
}

export default XalianTypeEffectivenessSummary;
