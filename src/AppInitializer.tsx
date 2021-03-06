import * as React from 'react'
import { SynapseClient } from 'synapse-react-client'
import { handleErrorRedirect } from './URLUtils'
export type AppInitializerToken = {
  token: string
}
export const TokenContext = React.createContext('')


class AppInitializer extends React.Component<{},AppInitializerToken> {
  constructor(props: any) {
    super(props)
    this.state = {
      token: ''
    }    
  }

  componentDidMount() {
    // is prompt=login?  if so, then clear the cookie
    const urlSearchParams = new URLSearchParams(window.location.search)
    // sorry, we don't support JWT in the url query params today
    // https://openid.net/specs/openid-connect-core-1_0.html#JWTRequests
    const requestObject = urlSearchParams.get('request')
    const requestUri = urlSearchParams.get('request_uri')
    if (requestObject) {
      handleErrorRedirect({error: 'request_not_supported'})
    }
    if (requestUri) {
      handleErrorRedirect({error: 'request_uri_not_supported'})
    }
    // sorry, we don't support registration (yet?)
    // https://openid.net/specs/openid-connect-core-1_0.html#RegistrationParameter
    const registration = urlSearchParams.get('registration')
    if (registration) {
      handleErrorRedirect({error: 'registration_not_supported'})
    }
  
    const prompt = urlSearchParams.get('prompt')
    if (prompt === 'login') {
      SynapseClient.setSessionTokenCookie(undefined, () => {
        urlSearchParams.set('prompt', '')
        // replace query params and refresh
        window.location.replace(`${window.location.href.slice(0, window.location.href.indexOf('?'))}?${urlSearchParams.toString()}`)
      })
    } else {
      SynapseClient.getSessionTokenFromCookie().then(
        (sessionToken: string|null) => {
          if (sessionToken) {
            return SynapseClient.putRefreshSessionToken(sessionToken).then(
              // backend doesn't return a response for this call, its empty
              (_response) => {
                this.setState({ token: sessionToken })
              }
            )
          }
        }).catch((_err) => {
          console.log('no token from cookie could be fetched ', _err)
          if (prompt === 'none') {
            // not logged in, and prompt is "none".
            handleErrorRedirect({error: 'login_required', error_description: 'User is not logged in, and prompt was set to none'})
          }
        })        
    }
    // on first time, also check for the SSO code
    SynapseClient.detectSSOCode()
  }

  render() {
    return (
      <TokenContext.Provider value={this.state.token}>
        {this.props.children}
      </TokenContext.Provider>
    )
  }
}

export default AppInitializer
