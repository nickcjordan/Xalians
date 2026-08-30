import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import species from '../json/species.json';
import XalianImage from '../components/xalianImage';
import XalianSpeciesRowView from '../components/views/xalianSpeciesRowView';
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
        // copy before sorting: species.json is a shared module import
        let sorted = [...species].sort((a, b) => a.id - b.id);
        var list = [];
        for (let ind in sorted) {
            list.push(
                this.buildSpeciesIcon(sorted[ind])
            );
        }
        return list;
    }

    buildStatRows() {
        let sorted = [...species].sort((a, b) => a.id - b.id);
        var list = [];
        for (let ind in sorted) {
            list.push(
                this.buildStatRow(sorted[ind])
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

    // A catalogue tile: the portrait mounted in a housing with the designation
    // stencilled on a plate beneath it. Previously a bare coloured square
    // floating on the starfield with loose text under it, which was the one
    // place on the site where a specimen had no housing at all.
    buildSpeciesIcon(x) {
        let type = x.type.toLowerCase();
        return (
            <a className={`species-tile g-el-${type}`} key={`species-icon-${x.id}`} href={'/species/' + x.id}>
                <span className="species-tile-plate">
                    <XalianImage colored speciesName={x.name} primaryType={x.type} moreClasses="species-tile-img" />
                </span>
                <span className="species-tile-legend">
                    <span className="species-tile-name">{x.name}</span>
                    <span className="species-tile-meta">
                        {svgUtil.getSpeciesTypeSymbol(x.type, true, 18)}
                        <span className="species-tile-id">#{x.id}</span>
                    </span>
                </span>
            </a>
        );
    }

    buildStatRow(x) {
        return <a key={`species-stat-row-${x.id}`} href={"/species/" + x.id}><XalianSpeciesRowView species={x} /></a>;
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
                            <header className="page-header">
                                <p className="g-kicker">Xalian Registry</p>
                                <h1 className="g-title">Discovered Species</h1>
                            </header>

                            {species &&
                                <Tabs defaultActiveKey="grid" id="tabbs" className="species-tab-group g-tabs">
                                    <Tab eventKey="grid" title="Grid" className="species-tab">
                                        <div className="species-grid">
                                            {this.state.gridList}
                                        </div>
                                    </Tab>
                                    <Tab eventKey="stat-row" title="Stats" className="">
                                        <div className="species-stat-rows">
                                            {this.state.statRowList}
                                        </div>
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