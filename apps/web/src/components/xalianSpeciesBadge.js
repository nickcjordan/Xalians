import React from 'react';
import { Badge } from '@/components/ui/badge';
import * as svgUtil from '../utils/svgUtil';

/**
 * A type chip: symbol plus name, filled with the element in scope.
 *
 * Version 4 on the new stack: `Badge variant="chip"`, no react-bootstrap
 * `Row`/`Col`. Every prop from the previous version is kept — the duel
 * board still renders these for its type-effectiveness summary.
 */
class XalianSpeciesBadge extends React.Component {
	render() {
		let type = this.props.type;
		if (!type) {
			return null;
		}
		let el = type.toLowerCase();
		return (
			<span id={this.props.id} className={`el-${el} inline-flex ${this.props.moreClasses || ''}`}>
				<Badge variant="chip" className={this.props.duel ? 'gap-1.5 px-2.5 py-1' : undefined}>
					{!this.props.hideSymbol &&
						svgUtil.getSpeciesTypeSymbol(type, false, this.props.size || 14, 'size-3.5')
					}
					{!this.props.hideName && type.toUpperCase()}
				</Badge>
			</span>
		);
	}
}

export default XalianSpeciesBadge;
