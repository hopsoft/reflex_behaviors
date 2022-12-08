import {
  appendHTML,
  addHighlight,
  coordinates,
  removeHighlight
} from '../utils/dom'
import supervisor from './supervisor'
import {
  addLeaderLineDependency,
  removeLeaderLineDependency
} from './dependencies'

document.addEventListener('reflex-behaviors:devtools-start', () =>
  supervisor.register('toggle', 'toggles<small>(trigger/target)</small>')
)

function appendTooltip (title, content, options = {}) {
  let { backgroundColor, color, position } = options
  color = color || 'white'
  position = position || 'top'
  return appendHTML(`
    <reflex-behaviors-devools-tooltip position="${position}" background-color="${backgroundColor}" color="${color}">
      <div slot='title'>${title}</div>
      ${content}
    </reflex-behaviors-devools-tooltip>
  `)
}

export default class ToggleDevtool {
  constructor (trigger) {
    this.name = 'toggle'
    this.reflex = trigger.dataset.turboReflex
    this.trigger = trigger
    this.target = trigger.target

    document.addEventListener('reflex-behaviors:devtool-enable', event => {
      const { name } = event.detail
      if (name === this.name) {
        addLeaderLineDependency()
        addHighlight(this.trigger, {
          outline: '3px dashed blueviolet',
          outlineOffset: '2px'
        })
      }
    })

    document.addEventListener('reflex-behaviors:devtool-disable', event => {
      const { name } = event.detail
      if (name === this.name) removeHighlight(this.trigger)
    })

    document.addEventListener('click', event => {
      if (event.target.closest('reflex-behaviors-devools-tooltip')) return
      this.hide()
    })
  }

  get enabled () {
    return supervisor.enabled(this.name)
  }

  show () {
    if (!this.enabled) return
    if (this.showing) return
    this.showing = true
    this.hide()

    addHighlight(this.target, {
      outline: '3px dashed darkcyan',
      outlineOffset: '-2px'
    })

    addHighlight(this.renderingElement, {
      outline: '3px dashed chocolate',
      outlineOffset: '3px'
    })

    const targetTooltip = this.createTargetTooltip()
    this.createTriggerTooltip(targetTooltip)
    this.createRenderingTooltip()

    document
      .querySelectorAll('.leader-line')
      .forEach(el => (el.style.zIndex = 100000))

    const data = {
      rendering: { partial: null, id: null },
      trigger: { partial: null, id: null },
      target: { partial: null, id: null }
    }

    if (this.renderingPartial) data.rendering.partial = this.renderingPartial
    if (this.renderingElement) data.rendering.id = this.renderingElement.id

    if (this.trigger)
      data.trigger = { partial: this.trigger.partial, id: this.trigger.id }

    if (this.target)
      data.target = { partial: this.target.partial, id: this.target.id }
    else if (this.trigger)
      data.target.id = `No element matches the targeted DOM id: ${this.trigger.controls}`

    console.table(data)
  }

  hide () {
    document.querySelectorAll('.leader-line').forEach(el => el.remove())
    document
      .querySelectorAll('reflex-behaviors-devools-tooltip')
      .forEach(el => el.remove())

    document
      .querySelectorAll('[data-reflex-behaviors-highlight]')
      .forEach(el => {
        if (!el.tagName.match(/toggle-trigger/i)) removeHighlight(el)
      })
  }

  createRenderingTooltip () {
    if (!this.renderingElement) return
    const title = `RENDERING (id: ${this.renderingElement.id || 'unknown'})`
    const content = `<div slot="emphasis">${this.renderingPartial}</div>`
    const tooltip = appendTooltip(title, content, {
      backgroundColor: 'lightyellow',
      color: 'chocolate'
    })

    const coords = coordinates(this.renderingElement)
    const top = Math.ceil(
      coords.top + coords.height / 2 - tooltip.offsetHeight / 2
    )
    const left = Math.ceil(coords.left + coords.width + 100)
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`

    tooltip.line = new LeaderLine(tooltip, this.renderingElement, {
      ...this.leaderLineOptions,
      color: 'chocolate'
    })

    tooltip.drag = new PlainDraggable(tooltip)
    tooltip.drag.onMove = () => tooltip.line.position()
    return tooltip
  }

  createTriggerTooltip (targetTooltip) {
    if (!this.trigger) return
    const title = `TRIGGER (controls: ${this.trigger.controls})`
    const content = this.trigger.viewStack
      .map(view => {
        return this.trigger.sharedViews.includes(view)
          ? `<div slot="emphasis">${view}</div>`
          : `<div slot="normal">${view}</div>`
      }, this)
      .join('')

    const tooltip = appendTooltip(title, content, {
      backgroundColor: 'lavender',
      color: 'blueviolet'
    })

    const coords = coordinates(this.trigger)
    const top = Math.ceil(coords.top - tooltip.offsetHeight * 2)
    const left = Math.ceil(coords.left + coords.width + tooltip.offsetWidth / 3)
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`

    tooltip.line = new LeaderLine(tooltip, this.trigger, {
      ...this.leaderLineOptions,
      color: 'blueviolet'
    })

    tooltip.lineToTarget = new LeaderLine(tooltip, targetTooltip, {
      ...this.leaderLineOptions,
      color: 'blueviolet',
      size: 2
    })

    tooltip.drag = new PlainDraggable(tooltip)
    tooltip.drag.onMove = () => {
      tooltip.line.position()
      tooltip.lineToTarget.position()
    }
    targetTooltip.drag.onMove = () => {
      targetTooltip.line.position()
      tooltip.lineToTarget.position()
    }
    return tooltip
  }

  createTargetTooltip () {
    if (!this.target) return
    if (!this.target.viewStack) return

    const title = `TARGET (id: ${this.target.id})`
    const content = this.target.viewStack
      .map(view => {
        return this.trigger.sharedViews.includes(view)
          ? `<div slot="emphasis">${view}</div>`
          : `<div slot="normal">${view}</div>`
      }, this)
      .join('')

    const tooltip = appendTooltip(title, content, {
      backgroundColor: 'lightcyan',
      color: 'darkcyan',
      position: 'bottom'
    })

    const coords = coordinates(this.target)
    const top = Math.ceil(coords.top + tooltip.offsetHeight)
    const left = Math.ceil(coords.left + coords.width + tooltip.offsetWidth / 3)
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`

    tooltip.line = new LeaderLine(tooltip, this.target, {
      ...this.leaderLineOptions,
      color: 'darkcyan'
    })

    tooltip.drag = new PlainDraggable(tooltip)
    return tooltip
  }

  get renderingPartial () {
    let partial = this.trigger ? this.trigger.renderingPartial : null
    partial = partial || (this.target ? this.target.renderingPartial : null)
    return partial
  }

  get renderingElement () {
    let element = this.trigger ? this.trigger.renderingElement : null
    element = element || (this.target ? this.target.renderingElement : null)
    return element
  }

  get leaderLineOptions () {
    return {
      dash: { animation: true },
      dropShadow: { opacity: 0.3 },
      endPlugSize: 1.3,
      size: 3,
      startPlug: 'disc',
      startPlugSize: 1.3
    }
  }
}
