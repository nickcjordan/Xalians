import logo from './logo.svg';
import './App.css';
import React from 'react'
import axios from 'axios';

class App extends React.Component {

  state = {
    xalian: null
  }
  
  componentDidMount() {
    const url = "https://os1fgnbkg2.execute-api.us-east-1.amazonaws.com/serverless_lambda_stage";
    axios.get(url)
        .then(response => 
          // this.setState({ xalian: response.data })
          console.log(JSON.stringify(response.data, null, 2))
          );
  }

  render() {
    console.log('Render lifecycle')
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
            { (this.state.xalian) && 
              <p>{this.state.xalian}</p>
            }
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}


export default App;
