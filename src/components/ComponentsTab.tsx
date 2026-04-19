import { useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import Badge from './ui/Badge'

function SectionHeader({ marker, title }: { marker: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-2">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-tertiary">
        {marker}
      </span>
      <h2 className="font-display text-3xl text-text-primary">{title}</h2>
    </div>
  )
}

function GroupHeader({ title }: { title: string }) {
  return (
    <h3 className="font-display text-xl text-text-secondary mb-4">{title}</h3>
  )
}

function Caption({ text }: { text: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary text-center mt-2">
      {text}
    </p>
  )
}

function Specimen({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div>{children}</div>
      <Caption text={caption} />
    </div>
  )
}

export default function ComponentsTab() {
  const [demoLoading, setDemoLoading] = useState(false)
  const [cardClicks, setCardClicks] = useState(0)

  const triggerLoadingDemo = () => {
    setDemoLoading(true)
    // 1.5s feels like a real network round-trip — long enough to read the
    // spinner, short enough not to be annoying.
    setTimeout(() => setDemoLoading(false), 1500)
  }

  return (
    <section className="px-8 py-10 max-w-5xl">
      <SectionHeader marker="§04 →" title="Components Tab" />
      <p className="font-body text-sm text-text-secondary max-w-2xl mb-12">
        The reusable primitives the rest of the app reaches for. Hover, focus,
        click — every state is real, not a screenshot. Tab through the inputs
        to feel the keyboard focus ring.
      </p>

      {/* Buttons */}
      <div className="mb-16">
        <GroupHeader title="Buttons" />

        <div className="space-y-10">
          {/* Variants */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-4">
              Variants — md size
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Specimen caption="primary">
                <Button label="Save changes" variant="primary" />
              </Specimen>
              <Specimen caption="secondary">
                <Button label="Cancel" variant="secondary" />
              </Specimen>
              <Specimen caption="tertiary">
                <Button label="Skip for now" variant="tertiary" />
              </Specimen>
              <Specimen caption="destructive">
                <Button label="Delete" variant="destructive" />
              </Specimen>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-4">
              Sizes — primary variant
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Specimen caption="sm">
                <Button label="Small" size="sm" />
              </Specimen>
              <Specimen caption="md">
                <Button label="Medium" size="md" />
              </Specimen>
              <Specimen caption="lg">
                <Button label="Large" size="lg" />
              </Specimen>
            </div>
          </div>

          {/* States */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-4">
              States — hover, focus, and loading are live
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Specimen caption="default — hover me">
                <Button label="Hover me" variant="primary" />
              </Specimen>
              <Specimen caption="loading — click to demo">
                <Button
                  label="Save changes"
                  variant="primary"
                  loading={demoLoading}
                  onClick={triggerLoadingDemo}
                />
              </Specimen>
              <Specimen caption="disabled">
                <Button label="Disabled" variant="primary" disabled />
              </Specimen>
              <Specimen caption="tab to focus">
                <Button label="Focus me" variant="secondary" />
              </Specimen>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="mb-16">
        <GroupHeader title="Cards" />

        <div className="space-y-10">
          {/* Variants */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-4">
              Variants
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Card variant="default">
                  <p className="font-display text-lg text-text-primary mb-2">
                    Default
                  </p>
                  <p className="font-body text-sm text-text-secondary">
                    Subtle inner highlight, no border. The everyday container.
                  </p>
                </Card>
                <Caption text="default" />
              </div>
              <div>
                <Card variant="bordered">
                  <p className="font-display text-lg text-text-primary mb-2">
                    Bordered
                  </p>
                  <p className="font-body text-sm text-text-secondary">
                    Crisp edge, no shadow. For when the container needs to
                    read clearly against its surroundings.
                  </p>
                </Card>
                <Caption text="bordered" />
              </div>
              <div>
                <Card variant="elevated">
                  <p className="font-display text-lg text-text-primary mb-2">
                    Elevated
                  </p>
                  <p className="font-body text-sm text-text-secondary">
                    Warm ember-tinted shadow. Use when something needs to feel
                    lifted off the page.
                  </p>
                </Card>
                <Caption text="elevated" />
              </div>
            </div>
          </div>

          {/* Interactive */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-4">
              Interactive — set <code className="text-text-secondary">interactive</code> to enable hover lift
            </p>
            <div className="max-w-sm">
              <Card
                variant="elevated"
                interactive
                onClick={() => setCardClicks((n) => n + 1)}
              >
                <p className="font-display text-lg text-text-primary mb-2">
                  Click me
                </p>
                <p className="font-body text-sm text-text-secondary">
                  Hover to feel the lift. Click to fire onClick.
                </p>
                <p className="font-mono text-xs uppercase tracking-wider text-ember-300 mt-4">
                  Clicked {cardClicks} {cardClicks === 1 ? 'time' : 'times'}
                </p>
              </Card>
              <Caption text="interactive — keyboard accessible" />
            </div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-16">
        <GroupHeader title="Inputs" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-2xl">
          <Input label="Default" placeholder="Type something…" />
          <Input
            label="With error"
            placeholder="email@example.com"
            error="Enter a valid email address"
          />
          <Input label="Disabled" placeholder="Can't type here" disabled />
          <Input label="Focus me" placeholder="Click in to see the glow" />
        </div>
      </div>

      {/* Badges */}
      <div className="mb-8">
        <GroupHeader title="Badges" />
        <div className="flex flex-wrap items-center gap-4">
          <Specimen caption="default">
            <Badge label="Draft" variant="default" />
          </Specimen>
          <Specimen caption="success">
            <Badge label="Live" variant="success" />
          </Specimen>
          <Specimen caption="warning">
            <Badge label="Pending" variant="warning" />
          </Specimen>
          <Specimen caption="info">
            <Badge label="New" variant="info" />
          </Specimen>
        </div>
      </div>
    </section>
  )
}
