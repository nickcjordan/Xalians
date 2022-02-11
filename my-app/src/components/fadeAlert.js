import React from "react";
import Alert from "react-bootstrap/Alert";
import { Hub } from "aws-amplify";

class FadeAlert extends React.Component {
  state = {
    isShowing: false,
    variant: "dark",
    headerText: null,
    bodyText: null,
  };

  componentDidMount() {
    Hub.listen("alert", (data) => {
      const type = data.payload.event;
      const req = data.payload.data;
      if (type == "new-alert") {
        this.setState(
          {
            isShowing: true,
            variant: req.variant || "dark",
            headerText: req.title,
            bodyText: req.text,
          },
          () => {
            setTimeout(() => {
              Hub.dispatch("alert", { event: "hide-alert", data: null, message: null });
            }, 3000);
          }
        );
      } else if (type == "hide-alert") {
        this.setState({ isShowing: false });
      } else if (type == "show-alert") {
        this.setState({ isShowing: true });
      }
    });
  }

  render() {
    return (
      <React.Fragment>
        {this.state.isShowing && (
          <Alert className='custom-alert' variant={this.state.variant} onClose={() => this.setState({ isShowing: false })} dismissible>
            {this.state.headerText && <Alert.Heading>{this.state.headerText}</Alert.Heading>}
            <p>{this.state.bodyText}</p>
          </Alert>
        )}
      </React.Fragment>
    );
  }
}

export default FadeAlert;
