import {Box, Card, Flex, Radio, Stack, Text} from '@sanity/ui'
import {type JSX, useCallback} from 'react'

export type DuplicateStrategy = 'skip' | 'update' | 'create'

export interface DuplicateOptionsProps {
  duplicateCount: number
  onStrategyChange: (strategy: DuplicateStrategy) => void
  selectedStrategy: DuplicateStrategy
}

interface StrategyOption {
  value: DuplicateStrategy
  title: string
  description: string
}

const strategies: StrategyOption[] = [
  {
    value: 'skip',
    title: 'Skip duplicates',
    description:
      'Do not import rows that match existing documents. Only new documents will be created.',
  },
  {
    value: 'update',
    title: 'Update existing',
    description:
      'Update existing documents with new data from CSV. Matching is based on _id field.',
  },
  {
    value: 'create',
    title: 'Create all as new',
    description: 'Create all rows as new documents, even if similar documents exist.',
  },
]

/**
 * Component for selecting duplicate handling strategy
 */
export function DuplicateOptions({
  duplicateCount,
  onStrategyChange,
  selectedStrategy,
}: DuplicateOptionsProps): JSX.Element {
  /**
   * Create memoized click handler for strategy selection
   */
  const createStrategyHandler = useCallback(
    (strategyValue: DuplicateStrategy) => () => onStrategyChange(strategyValue),
    [onStrategyChange],
  )

  return (
    <Stack space={4}>
      {duplicateCount > 0 && (
        <Card padding={4} radius={2} tone="caution">
          <Stack space={2}>
            <Text weight="semibold">
              {duplicateCount} potential duplicate{duplicateCount === 1 ? '' : 's'} found
            </Text>
            <Text muted size={1}>
              Some rows in your CSV may match existing documents. Choose how to handle them.
            </Text>
          </Stack>
        </Card>
      )}

      <Card padding={4} radius={2} shadow={1}>
        <Stack space={4}>
          <Text weight="semibold">Duplicate Handling Strategy</Text>

          <Stack space={3}>
            {strategies.map((strategy) => (
              <Card
                key={strategy.value}
                padding={3}
                radius={2}
                tone={selectedStrategy === strategy.value ? 'primary' : 'default'}
                style={{cursor: 'pointer'}}
                onClick={createStrategyHandler(strategy.value)}
              >
                <Flex gap={3}>
                  <Box style={{paddingTop: '2px'}}>
                    <Radio
                      checked={selectedStrategy === strategy.value}
                      onChange={createStrategyHandler(strategy.value)}
                    />
                  </Box>
                  <Stack space={1}>
                    <Text weight="semibold" size={1}>
                      {strategy.title}
                    </Text>
                    <Text muted size={1}>
                      {strategy.description}
                    </Text>
                  </Stack>
                </Flex>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Card>

      {selectedStrategy === 'update' && (
        <Card padding={3} radius={2} tone="caution">
          <Text size={1}>
            <strong>Note:</strong> Update strategy requires an <code>_id</code> column in your CSV
            to match existing documents.
          </Text>
        </Card>
      )}
    </Stack>
  )
}
