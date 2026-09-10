import React from 'react';
import XalianSpeciesBadge from '../../../xalianSpeciesBadge';
import typeEffectivenessMatrix from '@xalians/content/typeEffectivenessMatrix.json';
import species from '@xalians/content/species.json';

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

					<div>
						<div className="flex flex-col">
                            <span className="duel-effect-column-label">2X</span>
                            {superEffectTypes}
						</div>
					</div>

                    <div>
						<div className="flex flex-col">
                            <span className="duel-effect-column-label">Great</span>
                            {highEffectTypes}
						</div>
					</div>

                    {/* <div>
						<div className="flex flex-col">
                        <span className="duel-effect-column-label">Normal</span>
                            {mediumEffectTypes}
						</div>
					</div>  */}

                    <div>
						<div className="flex flex-col">
                            <span className="duel-effect-column-label">Low</span>
                            {lowEffectTypes}
						</div>
					</div>

                    <div>
						<div className="flex flex-col">
                            <span className="duel-effect-column-label">Immune</span>
                            {noEffectTypes}
						</div>
					</div>

			</React.Fragment>
		);
	}
}

export default XalianTypeEffectivenessSummary;
