import React from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

class GamePageGameFinishedModal extends React.Component {

    state = {
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    render() {

        return (
            <Dialog
                open={this.props.show}
                onOpenChange={(open) => { if (!open) { this.props.onHide(); } }}
            >
                <DialogContent
                    className={this.props.light ? 'themed-modal light-themed-modal' : 'themed-modal dark-themed-modal'}
                >
                    {this.props.title &&
                        <DialogHeader>
                            <DialogTitle>
                                {this.props.title}
                            </DialogTitle>
                        </DialogHeader>
                    }
                    {this.props.body &&
                        <div className="game-finished-modal-body">
                            {this.props.body}
                        </div>
                    }
                    {this.props.footer &&
                        <DialogFooter>
                            {this.props.footer}
                            {this.props.actions}
                        </DialogFooter>
                    }
                </DialogContent>
            </Dialog>
        );

    }

}

export default GamePageGameFinishedModal;
