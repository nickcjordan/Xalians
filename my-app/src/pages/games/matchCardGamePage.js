import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../../components/navbar';

import XalianImage from '../../components/xalianImage';
import MatchGameFlippedCard from '../../components/games/elements/matchGameFlippedCard';
import species from '../../json/species.json';

import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import ThemedSceneDiv from '../../components/views/themedSceneDiv';
gsap.registerPlugin(MotionPathPlugin, TextPlugin, ScrollTrigger, DrawSVGPlugin);

class MatchCardGamePage extends React.Component {
	state = {
		cardRowSize: 4,
		text: '',
		flippedStatus: new Map(),
		started: false,
        animating: false
	};

	componentWillUnmount() {
		window.removeEventListener('resize', this.updateSize);
	}

	componentDidMount() {
		window.addEventListener('resize', this.updateSize);
		this.updateSize();
		this.setCards();
       
	}

    startGameTapped = () => {
        if (!this.state.started) {
            let tl = gsap.timeline();
            tl.to('#match-game-start-button', { autoAlpha: 0 });
            this.flipAllCardsUp(tl);
            tl.to('#match-game-display-text', { text: { padSpace: true, preserveSpaces: true, value: '    3...'}, duration: 1 })
            .to('#match-game-display-text', { text: { padSpace: true, preserveSpaces: true, value: '    2...'}, duration: 1 })
            .to('#match-game-display-text', { text: { padSpace: true, preserveSpaces: true, value: '    1...'}, duration: 1 })
            .to('#match-game-display-text', { text: 'Start!', duration: 1 })
            .to('#match-game-display-text', { opacity: 0})
            .then(() => {
                this.setState({ started: true, startTime: performance.now() });
                this.flipAllCardsDown();
            });
        }
    }

   

	setSize = (w, h) => {
		let max = Math.max(w, h);
		let min = Math.min(w, h);

		let padding = 10;

		this.setState({
			size: {
				width: w - padding,
				height: h - padding,
				max: max - padding,
				min: min - padding,
			},
		});
	};

	updateSize = () => {
		this.setSize(window.innerWidth, Math.min(window.innerHeight*0.8, window.innerHeight - 100));
		// this.setSize(window.innerWidth, window.innerHeight - 100);
	};

	handleCardClick = (i, event, xalianImageElementId, xImageElementId) => {
        if (this.state.started && !this.state.animating) {
            
            
            var fs = this.state.flippedStatus;
            if (this.state.text) {
                this.setState({ text: null });
            }
            
            let data = this.state.cardData[event.currentTarget.id];
            if (data.status != 'matched' && (!this.state.selection || (this.state.selection && (data.id != this.state.selection.id)))) {
                if (this.state.selection == null || this.state.selection == undefined) {
                    this.setState({ selection: data });

                    // gsap.to(event.currentTarget, { opacity: 0.5 });

                    this.flipCardUp(xalianImageElementId, xImageElementId);


                    console.log('i=' + i + ' :: ' + JSON.stringify(data));
                    fs[event.currentTarget.id] = 'up';
                } else {
                    if (this.state.selection.species.name == data.species.name) {
                        // MATCH!
                        fs[event.currentTarget.id] = 'up';
                        this.handleMatch(this.state.selection, data, xalianImageElementId, xImageElementId, this.state.selection);
                        // this.flipCardUp(xalianImageElementId, xImageElementId);
                        
                    } else {
                        this.setState({ selection: null });
                        // gsap.to('#' + this.state.selection.id, { opacity: 1 });
                        fs[event.currentTarget.id] = 'down';
                        fs[this.state.selection.id] = 'down';
                        this.doIncorrectMatchAnimation(xalianImageElementId, xImageElementId, this.state.selection);
                    }
                }
            }
            this.setState({ flippedStatus: fs });
        } else {
            gsap.timeline()
            .fromTo('#match-game-start-button', { scale: 1}, { scale: 2, duration: 0.5 })
            .fromTo('#match-game-start-button', { scale: 2 }, { scale: 1, ease: 'bounce.out' })
            ;
        }
	};

    flipAllCardsDown = () => {
        this.setState({animating: true});
        let all = gsap.timeline();
        Object.values(this.state.cardData).forEach( data => {
            all.add(this.flipCardDown(data), "<");
        });
        all.then(() => {
            this.setState({animating: false});
        })
    }

    flipCardDown = (card) => {
        return gsap.timeline()
            .to(`#${card.imageId}`, {scaleX: 0, duration: 0.1}, "<")
            .to(`#${card.xId}`, {scaleX: 1, duration: 0.1});
    }

    flipAllCardsUp = (tl) => {
        this.setState({animating: true});
        let all = tl || gsap.timeline();
        Object.values(this.state.cardData).forEach( data => {
            all.add(this.flipCardUp(data.imageId, data.xId), "<");
        });
        all.then(() => {
            this.setState({animating: false});
        })
    }

    flipCardUp = (xalianImageElementId, xImageElementId) => {
        this.setState({animating: true});
        gsap.timeline()
                .to('#' + xImageElementId, {scaleX: 0, duration: 0.1})
                .fromTo('#' + xalianImageElementId, {scaleX: 0}, {scaleX: 1, duration: 0.1})
                .then(() => {
                    this.setState({animating: false});
                });
    }


    doIncorrectMatchAnimation = (xalianImageElementId, xImageElementId, selection) => {
        this.setState({animating: true});
        let up =  gsap.timeline()
            .to('#' + xImageElementId, {scaleX: 0, duration: 0.1}, "<")
            .fromTo('#' + xalianImageElementId, {scaleX: 0}, {scaleX: 1, duration: 0.1});

        let shake = gsap.timeline({ repeat: 1, yoyo: true})
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { scale: 1.1, duration: 0.05})
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { rotate: -2, duration: 0.025})
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { rotate: 2, duration: 0.025})
            

        let down = gsap.timeline()
            .to(`#${xalianImageElementId}, #${selection.imageId}`, {scaleX: 0, duration: 0.1})
            .to(`#${xImageElementId}, #${selection.xId}`, {scaleX: 1, duration: 0.1});
            
            
        gsap.timeline()
        .add(up)
        .add(shake)
        .add(down)
        .then(() => {
            this.setState({animating: false});
        });
    }

	handleMatch = (card1, card2, xalianImageElementId, xImageElementId, selection) => {

		card1.status = 'matched';
		card2.status = 'matched';
		let data = this.state.cardData;
		data[card1.id] = card1;
		data[card2.id] = card2;

		this.setState({ selection: null, cardData: data, text: 'Match!' });
		var allMatched = true;
		Object.values(this.state.cardData).forEach((card) => {
			let data = this.state.cardData[card.id];
			allMatched = allMatched && data.status == 'matched';
		});
		if (allMatched) {
            this.setState({ text: 'YOU WIN!' });
            this.doMatchAnimation(xalianImageElementId, xImageElementId, this.state.selection, () => {
                Object.values(this.state.cardData).forEach((data) => {
                    gsap.to(`#${data.imageId}`, { opacity: 1, duration: 0.3, repeat: 6, yoyo: true, ease: 'none' });
                });
            });
                let endTime = performance.now();
                var timeDiff = endTime - this.state.startTime; //in ms 
                // strip the ms 
                timeDiff /= 1000; 
                // get seconds 
                var seconds = Math.round(timeDiff * 100)/100;
                console.log(seconds + " seconds");
                gsap.to('#match-game-display-text', { text: { value: `${seconds} seconds`}, duration: 1, delay: 2, opacity: 1 });
		} else {
            this.doMatchAnimation(xalianImageElementId, xImageElementId, this.state.selection);
        }
	};

    
    doMatchAnimation = (xalianImageElementId, xImageElementId, selection, callBack) => {
        this.setState({animating: true});
        let up = gsap.timeline()
            .to('#' + xImageElementId, {scaleX: 0, duration: 0.1})
            .fromTo('#' + xalianImageElementId, {scaleX: 0}, {scaleX: 1, duration: 0.1});
        
        let grow = gsap.timeline({ repeat: 1, yoyo: true})
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { scale: 1.05, duration: 0.1})
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { opacity: 1, duration: 0.05})
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { opacity: 0.2, duration: 0.05})
            ;

        let dim = gsap.timeline()
            .to(`#${xalianImageElementId}, #${selection.imageId}`, { opacity: 0.25, duration: 0.15})
            .then(() => {
                if (callBack) {
                    callBack();
                }
            })
        gsap.timeline().add(up).add(grow).add(dim).then(() => {
            this.setState({animating: false});
        });
    }

	setCards = () => {
        this.shuffle(species);
		let fs = this.state.flippedStatus || new Map();
		var rowSize = this.state.cardRowSize;
		while ((rowSize * rowSize) % 2 != 0) {
			// odd
			rowSize += 1;
		}
		while (((rowSize * rowSize) / 2) > species.length) {
			rowSize -= 2;
		}
		let cards = [];
		let cardData = new Map();
		var setNum = 1; // differentiate from second half
		for (var i = 0; i < (rowSize * rowSize) / 2; i++) {
			this.buildCard(i, setNum, rowSize, cards, cardData, fs);
		}

		// make doubles
		setNum = 2; // differentiate from first half
		for (var i = 0; i < (rowSize * rowSize) / 2; i++) {
			this.buildCard(i, setNum, rowSize, cards, cardData, fs);
		}

		this.shuffle(cards);

		this.setState({
			cards: cards,
			cardData: cardData,
			flippedStatus: fs,
		});
	};

	shuffle = (array) => {
		let currentIndex = array.length,
			randomIndex;
		while (currentIndex != 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;
			[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
		}

		return array;
	};

    buildCard(i, setNum, rowSize, cards, cardData, fs) {
        let rand = Math.random() * 1.5;
        let x = species[i];
        let id = 'match-card-game-card-' + species.indexOf(x) + '-' + setNum;
        let imageId = id + '-xalian-image';
        let xId = id + '-x-image';
        let card = (
            <React.Fragment>
                <Col xs={12 / rowSize} style={{ position: 'relative', overflow: 'visible', justifyContent: 'center', alignContent: 'center' }}>
                    <div onClick={(event) => { this.handleCardClick(species.indexOf(x), event, imageId, xId); } } style={{ padding: '0px', position: 'relative', overflow: 'visible', margin: 'auto' }} id={id}>
                        <XalianImage id={imageId} moreClasses="match-game-card-flipped" speciesName={x.name} primaryType={x.type} colored bordered />
                        <MatchGameFlippedCard delay={rand} id={xId} moreClasses="match-game-card-flipped" visibility='visible'/>
                        <div className={'xalian-image-wrapper '}></div>
                    </div>
                </Col>
            </React.Fragment>
        );
        cards.push(card);
        let data = {
            index: species.indexOf(x),
            species: x,
            card: card,
            status: 'unmatched',
            id: id,
            imageId: imageId,
            xId: xId
        };
        cardData[id] = data;
        fs[id] = 'down';
    }

	render() {
		return (
			<React.Fragment>
				<Container fluid className="content-background-container">
					<XalianNavbar></XalianNavbar>

					<Row style={{ margin: '5px' }}>
						<Col>
							{this.state.size && (
								<Container fluid className="game-container game-centered-over-object" style={{ height: this.state.size.min, width: this.state.size.min, overflow: 'visible', maxHeight: this.state.cardRowSize * 350, maxWidth: this.state.cardRowSize * 350 }}>
									<div id="match-card-game-wrapper" className="match-card-game-wrapper" style={{ margin: 'auto' }}>
										{this.state.cards}
									</div>
								</Container>
							)}
									<div className="game-bottom-over-object">
										<Button id="match-game-start-button" variant="xalianGreen" onClick={this.startGameTapped} style={{ fontSize: 'large', padding: '20px' }}>
											Start
										</Button>
										<h1 className='game-display-text white-outline-text'>{this.state.text}</h1>
										<h1 className='game-display-text white-outline-text' id="match-game-display-text">Ready...</h1>
									</div>
						</Col>
						<Col>{/* <h1>{this.state.started.toString()}</h1> */}</Col>
					</Row>
				</Container>
			</React.Fragment>
		);
	}
}

export default MatchCardGamePage;
