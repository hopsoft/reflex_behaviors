import {
  appendHTML,
  addHighlight,
  coordinates,
  removeHighlight
} from '../utils/dom'
import supervisor from './supervisor'

let activeToggle

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

    let hideTimeout
    const debouncedHide = () => {
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(this.hide(true), 25)
    }

    addEventListener('click', event => {
      if (event.target.closest('reflex-behaviors-devools-tooltip')) return
      debouncedHide()
    })

    addEventListener('turbo:load', debouncedHide)
    addEventListener('turbo-frame:load', debouncedHide)
    addEventListener('turbo-reflex:success', debouncedHide)
    addEventListener('turbo-reflex:finish', debouncedHide)
  }

  get enabled () {
    return supervisor.enabled(this.name)
  }

  show () {
    if (!this.enabled) return
    if (activeToggle === this) return
    activeToggle = this
    this.hide()

    addHighlight(this.target, {
      outline: '3px dashed darkcyan',
      outlineOffset: '-2px'
    })

    addHighlight(this.trigger.renderingElement, {
      outline: '3px dashed chocolate',
      outlineOffset: '3px'
    })

    const renderingTooltip = this.createRenderingTooltip()
    const targetTooltip = this.createTargetTooltip()
    this.createTriggerTooltip(targetTooltip, renderingTooltip)

    document
      .querySelectorAll('.leader-line')
      .forEach(el => (el.style.zIndex = 100000))

    const data = {
      rendering: {
        partial: this.trigger.renderingPartial,
        id: this.trigger.renderingInfo.id,
        status: this.trigger.renderingElement ? 'OK' : 'Not Found'
      },
      trigger: { partial: null, id: null, status: 'Not Found' },
      target: { partial: null, id: null, status: 'Not Found' }
    }

    if (this.trigger)
      data.trigger = {
        partial: this.trigger.partial,
        id: this.trigger.id,
        status: 'OK'
      }

    if (this.target)
      data.target = {
        partial: this.target.partial,
        id: this.target.id,
        status: 'OK'
      }

    console.table(data)
  }

  hide (clearActiveToggle) {
    document.querySelectorAll('.leader-line').forEach(el => el.remove())
    document
      .querySelectorAll('reflex-behaviors-devools-tooltip')
      .forEach(el => el.remove())

    document
      .querySelectorAll('[data-reflex-behaviors-highlight]')
      .forEach(el => {
        if (!el.tagName.match(/toggle-trigger/i)) removeHighlight(el)
      })

    if (clearActiveToggle) activeToggle = null
  }

  createRenderingTooltip () {
    if (!this.trigger.renderingElement)
      return console.debug(
        `Unable to create the rendering tooltip! No element matches the DOM id: '${this.trigger.renderingInfo.id}'`
      )

    const title = `RENDERING (id: ${this.trigger.renderingElement.id ||
      'unknown'})`
    const content = `<div slot="content">partial: ${this.trigger.renderingPartial}</div>`
    const tooltip = appendTooltip(title, content, {
      backgroundColor: 'lightyellow',
      color: 'chocolate'
    })

    const coords = coordinates(this.trigger.renderingElement)
    const top = Math.ceil(
      coords.top + coords.height / 2 - tooltip.offsetHeight / 2
    )
    const left = Math.ceil(coords.left + coords.width + 100)
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`

    tooltip.line = new LeaderLine(tooltip, this.trigger.renderingElement, {
      ...this.leaderLineOptions,
      color: 'chocolate'
    })

    tooltip.drag = new PlainDraggable(tooltip)
    return tooltip
  }

  createTargetTooltip () {
    if (!this.target)
      return console.debug(
        `Unable to create the target tooltip! No element matches the DOM id: '${this.trigger.controls}'`
      )

    const title = `TARGET (id: ${this.target.id})`
    const content = this.target.viewStack
      .reverse()
      .map((view, index) => {
        return this.trigger.sharedViews.includes(view)
          ? `<div slot="content-top">${index + 1}. ${view}</div>`
          : `<div slot="content-bottom">${index + 1}. ${view}</div>`
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

  createTriggerTooltip (targetTooltip, renderingTooltip) {
    if (!this.trigger) return
    const title = `TRIGGER (controls: ${this.trigger.controls})`
    const content = this.trigger.viewStack
      .reverse()
      .map((view, index) => {
        return this.trigger.sharedViews.includes(view)
          ? `<div slot="content-top">${index + 1}. ${view}</div>`
          : `<div slot="content-bottom">${index + 1}. ${view}</div>`
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

    tooltip.line = new LeaderLine(this.trigger, tooltip, {
      ...this.leaderLineOptions,
      color: 'blueviolet'
    })

    if (targetTooltip) {
      tooltip.lineToTarget = new LeaderLine(tooltip, targetTooltip, {
        ...this.leaderLineOptions,
        color: 'blueviolet',
        middleLabel: 'toggles',
        size: 2.1
      })

      targetTooltip.drag.onMove = () => {
        targetTooltip.line.position()
        tooltip.lineToTarget.position()
        tooltip.lineToRendering.position()
      }
    }

    if (renderingTooltip) {
      tooltip.lineToRendering = new LeaderLine(tooltip, renderingTooltip, {
        ...this.leaderLineOptions,
        color: 'blueviolet',
        middleLabel: 'renders',
        size: 2.1
      })

      renderingTooltip.drag.onMove = () => {
        renderingTooltip.line.position()
        if (tooltip.lineToTarget) tooltip.lineToTarget.position()
        tooltip.lineToRendering.position()
      }
    }

    tooltip.drag = new PlainDraggable(tooltip)
    tooltip.drag.onMove = () => {
      tooltip.line.position()
      if (tooltip.lineToTarget) tooltip.lineToTarget.position()
      if (tooltip.lineToRendering) tooltip.lineToRendering.position()
    }

    return tooltip
  }

  get leaderLineOptions () {
    return {
      dash: { animation: true },
      dropShadow: { opacity: 0.3 },
      endPlug: 'arrow3',
      endPlugSize: 1.7,
      size: 3,
      startPlug: 'disc',
      startPlugSize: 1
    }
  }
}
