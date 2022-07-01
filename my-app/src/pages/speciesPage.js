import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import Image from 'react-bootstrap/Image';
import Table from 'react-bootstrap/Table';
import PlanetTable from '../components/planetTable';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import species from '../json/species.json';
import XalianImage from '../components/xalianImage';
import XalianSpeciesRowView from '../components/views/xalianSpeciesRowView';
import XalianSpeciesBadge from '../components/xalianSpeciesBadge';
import XalianSpeciesSizeComparisonView from '../components/views/xalianSpeciesSizeComparisonView';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import * as svgUtil from '../utils/svgUtil';

class SpeciesPage extends React.Component {

    state = {
        gridList: [],
        statRowList: [],
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateSize);
    }

    componentDidMount() {
        window.addEventListener('resize', this.updateSize);
        this.updateSize();
        this.setState({
            gridList: this.buildSpeciesGridList(),
            statRowList: this.buildStatRows(),
            // sizeList: this.buildSizeComparison()
        });
    }

    setSize = (w, h) => {
        let max = Math.max(w, h)
        let min = Math.min(w, h);

        let padding = 20;

        this.setState({
            size: {
                width: w - padding,
                height: h,
                max: max - padding,
                min: min - padding,
            },
        });
    };

    updateSize = () => {
        this.setSize(window.innerWidth, window.innerHeight * 0.6);
    };


    // buildSizeComparison() {
    //     return <XalianSpeciesSizeComparisonView size={this.state.size} />;
    // }

    buildSpeciesGridList() {
        species.sort((a, b) => a.id - b.id);
        var list = [];
        for (let ind in species) {
            list.push(
                this.buildSpeciesIcon(species[ind])
            );
        }
        return list;
    }

    buildStatRows() {
        species.sort((a, b) => a.id - b.id);
        var list = [];
        for (let ind in species) {
            list.push(
                this.buildStatRow(species[ind])
            );
        }
        return list;
    }

    // buildTypeRows() {
    //     species.sort((a, b) => a.id - b.id);
    //     var list = [];
    //     for (let ind in species) {
    //         list.push(
    //             this.buildStatRow(species[ind])
    //         );
    //     }
    //     return list;
    // }

    buildSpeciesIcon(x) {
        return (
			<Col md={2} sm={3} xs={6} className="species-col">
				<a href={'/species/' + x.id}>
					<XalianImage colored bordered speciesName={x.name} primaryType={x.type} moreClasses="xalian-image-grid" />
					<Row style={{ width: '100%', margin: '0px', padding: '0px' }}>
						<Col xs={5} style={{ margin: 'auto', padding: '0px', paddingRight: '5px', textAlign: 'right' }}>
							{svgUtil.getSpeciesTypeSymbol(x.type, true, 25)}
						</Col>
						<Col xs={7} style={{ padding: '0px', height: '100%', margin: 'auto' }}>
							<h6 className="condensed-row" style={{ textAlign: 'left', margin: 'auto', height: '100%', width: '100%' }}>
								#{x.id}
							</h6>
						</Col>
					</Row>
					<h5 className="condensed-row species-name-title" style={{ textAlign: 'center' }}>
						{x.name}
					</h5>
				</a>
			</Col>
		);
    }

    buildStatRow(x) {
        return <a href={"/species/" + x.id}><XalianSpeciesRowView species={x} /></a>;
    }

    getTypeColorClassName(x) {
        return `${x.type.toLowerCase()}-color`;
    }

    render() {

        return <React.Fragment>

                <XalianNavbar></XalianNavbar>
                <SplashGalaxyBackground direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>
            {/* <Container fluid className="content-background-container"> */}

                <Container className="">
                    <Row className="">

                        <Col className="template-col-wrapper ">
                            <h1 className="page-title-text">Discovered Species</h1>

                            {species &&
                                <Tabs defaultActiveKey="grid" id="tabbs" className="species-tab-group">
                                    <Tab eventKey="grid" title="Grid" className="species-tab">
                                        <Row>
                                            {this.state.gridList}
                                        </Row>
                                    </Tab>
                                    <Tab eventKey="stat-row" title="Stats" className="">
                                        <Row>
                                            {this.state.statRowList}
                                        </Row>
                                    </Tab>
                                    <Tab eventKey="size-comparison" title="Size Comparison" className="">
                                            {this.state.size &&
                                                <XalianSpeciesSizeComparisonView size={this.state.size} />
                                            }
                                    </Tab>
                                    {/* <Tab eventKey="grid-by-type" title="Elements" className="">
                                            {this.state.typeRowList}
                                    </Tab> */}
                                </Tabs>
                            }

                        </Col>

                    </Row>

                </Container>
            {/* </Container> */}
            </SplashGalaxyBackground>
        </React.Fragment>


    }

}


export default SpeciesPage;