import React from 'react';

/**
 * The four generated moves, printed as a rated list.
 *
 * Previously a nest of bootstrap Rows and Cols whose name, rating and
 * description were an h5, an h4 and an h6 — three heading levels for one list
 * item, styled in three unrelated ways. A move is a labelled figure with a
 * caption, so it is drawn as one: the rating in a stamped chip, the name in
 * stencil, the description as prose.
 */
class XalianMoveSet extends React.Component {

	buildMoveRow(move) {
		return (
			<li className="move-row" key={move.name}>
				<span className="move-rating" title="Move rating">{move.rating}</span>
				<div className="move-detail">
					<h3 className="move-name">{move.name}</h3>
					{this.props.showDescription &&
						<p className="move-description">{move.description}</p>
					}
				</div>
			</li>
		);
	}

	render() {
		return (
			<ul className="xalian-move-set">
				{this.props.moves.map((move) => this.buildMoveRow(move))}
			</ul>
		);
	}
}

export default XalianMoveSet;
