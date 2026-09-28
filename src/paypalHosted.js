export const HOSTED_BUTTONS = {
  'motion-to-quash': 'GHDTG49B6VS5N',
  'motion-to-dismiss': 'SZLCKPWK2ZUEL',
}

export const PAYPAL_SDK_URL = 'https://www.paypal.com/sdk/js?client-id=BAANlJ8_Udaid6sH3yEZIktq5w5rV6-b6t38hgqGY8i-0cd_994lEFyRdyMwRXrnaY-OMeBNNUAo3-EIKU&components=hosted-buttons&enable-funding=venmo&currency=USD'

let sdkPromise

export function loadHostedPayPal() {
  if (window.paypal?.HostedButtons) return Promise.resolve(window.paypal)
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = PAYPAL_SDK_URL
      script.async = true
      const fail = () => {
        script.remove()
        reject(new Error('PayPal checkout did not load.'))
      }
      script.onload = () => window.paypal?.HostedButtons ? resolve(window.paypal) : fail()
      script.onerror = fail
      document.head.appendChild(script)
    }).catch(error => {
      sdkPromise = null
      throw error
    })
  }
  return sdkPromise
}
