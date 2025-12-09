import {CheckmarkCircleIcon} from '@sanity/icons'
import {Box, Flex, Text} from '@sanity/ui'
import type {JSX} from 'react'
import {useCallback} from 'react'

export interface Step {
  id: string
  label: string
}

export interface StepIndicatorProps {
  steps: Step[]
  currentStepId: string
  completedStepIds: string[]
  onStepClick?: (stepId: string) => void
}

function getCircleBackgroundColor(isCompleted: boolean, isCurrent: boolean): string {
  if (isCompleted) return 'var(--card-badge-positive-bg-color)'
  if (isCurrent) return 'var(--card-badge-primary-bg-color)'
  return 'transparent'
}

export function StepIndicator({
  steps,
  currentStepId,
  completedStepIds,
  onStepClick,
}: StepIndicatorProps): JSX.Element {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId)

  const handleStepClick = useCallback(
    (stepId: string, isClickable: boolean) => {
      if (isClickable && onStepClick) {
        onStepClick(stepId)
      }
    },
    [onStepClick],
  )

  return (
    <Box paddingY={4}>
      <Flex align="center" justify="center">
        {steps.map((step, index) => {
          const isCompleted = completedStepIds.includes(step.id)
          const isCurrent = step.id === currentStepId
          const isClickable = Boolean(isCompleted && onStepClick)

          return (
            <Flex key={step.id} align="center">
              {/* Step Circle + Label */}
              <Flex
                direction="column"
                align="center"
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: !isCompleted && !isCurrent ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
                onClick={handleStepClick.bind(null, step.id, isClickable)}
              >
                {/* Circle */}
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: getCircleBackgroundColor(isCompleted, isCurrent),
                    border:
                      isCompleted || isCurrent ? 'none' : '2px solid var(--card-border-color)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? (
                    <CheckmarkCircleIcon
                      style={{
                        fontSize: 20,
                        color: 'var(--card-badge-positive-fg-color)',
                      }}
                    />
                  ) : (
                    <Text
                      size={1}
                      weight="semibold"
                      style={{
                        color: isCurrent
                          ? 'var(--card-badge-primary-fg-color)'
                          : 'var(--card-muted-fg-color)',
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </Flex>

                {/* Label */}
                <Box marginTop={2}>
                  <Text
                    size={0}
                    weight={isCurrent ? 'semibold' : 'regular'}
                    muted={!isCurrent && !isCompleted}
                    style={{
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {step.label}
                  </Text>
                </Box>
              </Flex>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <Box
                  marginX={3}
                  style={{
                    width: 40,
                    height: 2,
                    backgroundColor:
                      index < currentIndex
                        ? 'var(--card-badge-positive-bg-color)'
                        : 'var(--card-border-color)',
                    transition: 'background-color 0.2s ease',
                    marginBottom: 24, // Offset for label space
                  }}
                />
              )}
            </Flex>
          )
        })}
      </Flex>
    </Box>
  )
}
