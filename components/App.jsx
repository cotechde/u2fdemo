import React from 'react'

import * as u2fUtils from '../lib/u2f'

import Registration from './Registration.jsx'
import Signing from './Signing.jsx'
import About from './About.jsx'

// Should always be the location of the origin.  Will be enforced by the Chrome extension, so changing it will result in failure
const appId = document.location.protocol + '//' + document.location.host

const routeMap = {
  'about': '',
  'reg': 'reg',
  'sig': 'sig'
}

let timeoutFn = null

export default class App extends React.Component {
  constructor() {
    super()
    this.state = {
      timeout: 0,
      route: 'about', registration: {
        appId,
        challenge: 'LoooooooongRegisterChallenge',
        response: null,
        parsedResponse: null,
      },
      signing: {
        appId,
        keyHandle: '',
        challenge: 'SigningChallenge',
      }
    }
    this.onRegister = this.onRegister.bind(this)
    this.onSign = this.onSign.bind(this)
    this.updateRegState = this.updateRegState.bind(this)
    this.updateSigningState = this.updateSigningState.bind(this)
    this.onRouteChange = this.onRouteChange.bind(this)
  }

  componentDidMount() {
    this.setRoute(window.location.hash)
    window.onhashchange = () => {
      this.stopTimeout()
      this.setRoute(window.location.hash)
    }
  }

  setRoute(route) {
    route = route.replace('#','')
    let matchedRoute = routeMap[route]
    if (matchedRoute) {
      window.location.hash = route
      this.setState({route: route})
    } else {
      window.location.hash = ''
      this.setState({route: 'about'})
    }
  }

  // Show the timeout progess bar
  startTimeout(start, total) {
    if (this.state.timeout === 0) {
      this.setState({timeout: 100})
    }
    timeoutFn = setTimeout(()=>{
      let left = total - (Date.now() - start)
      let percent = Math.floor((left / total) * 100)
      if (percent > 0) {
        this.setState({timeout: percent})
        this.startTimeout(start, total)
      } else {
        this.setState({timeout: 0})
      }
    }, 1000)
  }

  // Stop the timeout progess bar
  stopTimeout() {
    this.setState({timeout: 0})
    clearTimeout(timeoutFn)
  }

  onRouteChange({target}) {
    this.stopTimeout()
    this.setRoute(target.name)
  }

  updateRegState({target}) {
    const {name, value} = target
    let registration = Object.assign({}, this.state.registration)
    registration[name] = value
    return this.setState({registration})
  }

  updateSigningState({target}) {
    const {name, value} = target
    let signing = Object.assign({}, this.state.signing)
    signing[name] = value
    return this.setState({signing})
  }

  onRegister(e) {
    e.preventDefault()
    console.log('Start Registration')
    this.startTimeout(Date.now(), 30000)
    let registerRequest = {
      challenge: this.state.registration.challenge,
      version: 'U2F_V2'
    }
    u2f.register(appId, [registerRequest], [],
      (deviceResponse) => {
        console.log('Response', deviceResponse)
        this.stopTimeout()
        let registration = Object.assign({}, this.state.registration)
        if (deviceResponse.errorCode) {
          console.log("ErrorCode:", deviceResponse.errorCode)
          registration['response'] = {errorCode: deviceResponse.errorCode}
        } else {
          let parsedResponse = u2fUtils.parseRegistration(deviceResponse)
          registration['response'] = deviceResponse
          registration['parsedResponse'] = parsedResponse
          this.setState({registration})
          let signing = Object.assign({}, this.state.signing)
          signing['keyHandle'] = parsedResponse.keyHandle
          this.setState({signing})
        }
        this.setState({registration})
      }, 30
    )
  }

  onSign(e) {
    e.preventDefault()
    console.log('Start Signing')
    this.startTimeout(Date.now(), 30000)
    let registeredKey = {
      keyHandle: this.state.signing.keyHandle,
      version: 'U2F_V2'
    }
    u2f.sign(appId, this.state.signing.challenge, [registeredKey],
      (deviceResponse) => {
        console.log('Response', deviceResponse)
        this.stopTimeout()
        let signing = Object.assign({}, this.state.signing)
        if (deviceResponse.errorCode) {
          console.log("ErrorCode:", deviceResponse.errorCode)
          signing['response'] = {errorCode: deviceResponse.errorCode}
        } else {
          let parsedResponse = u2fUtils.parseSignature(deviceResponse)
          signing['response'] = deviceResponse
          signing['parsedResponse'] = parsedResponse
        }
        this.setState({signing})
      }, 30
    )
  }

  renderRoute(){
    if (this.state.route === 'reg') {
      return(
        <Registration
          {...this.state.registration}
          timeout={this.state.timeout}
          onUpdate={this.updateRegState}
          onRegister={this.onRegister}
        />
      )
    } else if (this.state.route === 'sig') {
      return(
        <Signing
          {...this.state.signing}
          timeout={this.state.timeout}
          onUpdate={this.updateSigningState}
          onSign={this.onSign}
        />
      )
    } else {
      return(
        <Registration
          {...this.state.registration}
          timeout={this.state.timeout}
          onUpdate={this.updateRegState}
          onRegister={this.onRegister}
        />
      )
    }
  }

  render() {
    return (
      <div>
        <nav className="navbar sticky-top navbar-expand navbar-light bg-light">
          <a className="navbar-brand" href="https://hwsecurity.dev">
            <img src="https://hwsecurity.dev/img/icon.svg" height="30" className="d-inline-block align-top" alt="" />
            Hardware Security SDK - FIDO U2F
          </a>
        </nav>
        <nav className="navbar sticky-top navbar-expand navbar-light bg-light">
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav mr-auto">
              <li className={"nav-item " + ('reg' === this.state.route ? 'active' : '') }>
                <a className="nav-link" name="reg" href="#reg" >Registration</a>
              </li>
              <li className={"nav-item " + ('sig' === this.state.route ? 'active' : '') }>
                <a className="nav-link" name="sig" href="#sig" >Signing</a>
              </li>
            </ul>
          </div>
        </nav>
        {this.renderRoute()}
      </div>)
  }
}
