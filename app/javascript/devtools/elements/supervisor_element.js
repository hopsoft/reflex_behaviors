import { appendHTML } from '../../html'

export default class SupervisorElement extends HTMLElement {
  constructor () {
    super()
    this.enabledNames = []
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = this.html
    this.shadowRoot
      .querySelector('button[data-role="closer"]')
      .addEventListener('click', () => this.close())

    this.addEventListener('change', event => {
      const { checked, name } = event.target
      checked ? this.enableDevtool(name) : this.disableDevtool(name)
    })
  }

  enableDevtool (name) {
    if (this.enabledNames.includes(name)) return
    this.enabledNames.push(name)
  }

  disableDevtool (name) {
    if (!this.enabledNames.includes(name)) return
    const index = this.enabledNames.indexOf(name)
    if (index < 0) return
    this.enabledNames.splice(index, 1)
  }

  close () {
    this.devtoolElements.forEach(
      el =>
        (el.shadowRoot.querySelector('input[type="checkbox"]').checked = false)
    )
    this.remove()
  }

  get devtoolElements () {
    return this.querySelectorAll('[slot="devtool"]')
  }

  get closeElement () {
    return this.querySelector('button[data-role="closer"]')
  }

  get html () {
    return `
      <style>${this.stylesheet}</style>
      <div data-role="container">
        <strong>ReflexBehaviors</strong>
        <slot name="devtool"></slot>
        <button data-role='closer'>X</button>
      </div>
    `
  }

  get stylesheet () {
    return `
      :host {
        background-color: ghostwhite;
        border-radius: 10px;
        outline: solid 1px gainsboro;
        bottom: 20px;
        display: block;
        filter: drop-shadow(0 4px 3px rgba(0,0,0,.07));
        left: 50%;
        padding: 5px 10px;
        position: fixed;
        transform: translateX(-50%);
        z-index: 10000;
      }

      :host, :host * {
        -webkit-user-select: none;
        user-select: none;
      }

      strong {
        color: silver;
        font-weight: 600;
      }

      div[data-role="container"] {
        display: flex;
        gap: 0 5px;
      }

      button[data-role="closer"] {
        border: none;
        background-color: gainsboro;
        border-radius: 50%;
        color: white;
        font-size: 12px;
        height: 18px;
        line-height: 18px;
        margin: 0 -5px 0 10px;
        padding: 0 3px;
        width: 18px;
      }
    `
  }
}