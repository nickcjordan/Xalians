import React from 'react';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import XalianSpeciesBadge from './xalianSpeciesBadge';
import XalianImage from './xalianImage';
import XalianAttributeChart from './xalianAttributeChart';

/**
 * A specimen record: the creature equivalent of the planetary survey record.
 *
 * Both the generator and the species pages previously scattered the name, the
 * portrait, the attributes and the description across four loose bootstrap
 * columns floating on the starfield, with no housing around any of it. This
 * puts them on one panel in the same order every record uses — designation
 * across the top, plate on the left, printed data beside it — so a generated
 * Xalian and a catalogued species read as two copies of the same document.
 *
 * `children` are the readouts (stat charts, move sets) that hang below the
 * record proper.
 */
class XalianRecord extends React.Component {

	state = { jsonModalShow: false }

	/** the generated shape and the canon species shape name things differently */
	getSubject() {
		let xalian = this.props.xalian;
		if (xalian) {
			return {
				name: xalian.species.name,
				id: xalian.speciesId,
				description: xalian.species.description,
				primaryType: xalian.elements.primaryType,
				secondaryType: xalian.elements.secondaryType,
			};
		}
		let species = this.props.species;
		if (species) {
			return {
				name: species.name,
				id: species.id,
				description: species.description,
				primaryType: species.type,
				secondaryType: null,
			};
		}
		return null;
	}

	render() {
		let subject = this.getSubject();
		if (!subject) {
			return null;
		}

		let element = subject.primaryType.toLowerCase();

		return (
			<React.Fragment>
				<Container className={`g-panel g-panel--tagged g-el-${element} specimen-panel`}>

					<header className="specimen-head">
						<div className="specimen-ident">
							<p className="g-kicker">{this.props.kicker || 'Specimen Record'}</p>
							<h1 className="g-h2 specimen-name">{subject.name}</h1>
						</div>
						<div className="specimen-head-meta">
							{!this.props.hideId && subject.id &&
								<span className="specimen-id">#{subject.id}</span>
							}
							<XalianSpeciesBadge type={element} />
							{subject.secondaryType &&
								<XalianSpeciesBadge type={subject.secondaryType.toLowerCase()} />
							}
							{this.props.json &&
								<button
									type="button"
									className="g-btn g-btn--icon specimen-json-btn"
									title="View raw record"
									aria-label="View raw record"
									onClick={() => this.setState({ jsonModalShow: true })}>
									<i className="bi bi-file-earmark-binary" />
								</button>
							}
						</div>
					</header>

					<div className="specimen-body">
						<div className="specimen-plate">
							<XalianImage
								colored
								speciesName={subject.name}
								primaryType={subject.primaryType}
								secondaryType={subject.secondaryType}
								moreClasses="specimen-plate-img" />
						</div>

						<div className="specimen-data">
							<XalianAttributeChart xalian={this.props.xalian} species={this.props.species} />
							{subject.description &&
								<p className="specimen-description">{subject.description}</p>
							}
						</div>
					</div>

					{this.props.children &&
						<div className="specimen-readouts">{this.props.children}</div>
					}

				</Container>

				{this.props.json &&
					<Modal
						show={this.state.jsonModalShow}
						onHide={() => this.setState({ jsonModalShow: false })}
						size="lg"
						centered
						className="themed-modal dark-themed-modal">
						<Modal.Header closeButton closeVariant="white">
							<Modal.Title>{subject.name} Record Data</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<pre className="g-screen specimen-json">{this.props.json}</pre>
						</Modal.Body>
					</Modal>
				}
			</React.Fragment>
		);
	}
}

export default XalianRecord;
