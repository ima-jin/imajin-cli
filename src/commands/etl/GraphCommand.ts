import { Command } from 'commander';
import * as fs from 'node:fs';
import { DefaultBridgeRegistry, BridgeComponent } from '../../etl/bridges.js';
import type { Logger } from '../../logging/Logger.js';
import { CommonOptions } from '../../utils/commonOptions.js';

export class GraphCommand {
    private readonly registry: DefaultBridgeRegistry;
    private logger: Logger | null = null;

    constructor() {
        this.registry = new DefaultBridgeRegistry();
        try {
            const container = (globalThis as any).imajinApp?.container;
            if (container) {
                this.logger = container.resolve('logger') as Logger;
            }
        } catch (error) {
            // Logger not available
        }
    }

    public register(program: Command): void {
        const graphCommand = program
            .command('graph')
            .description('Graph translation operations');

        // Translate between models
        graphCommand
            .command('translate <source> <target>')
            .description('Translate between graph models')
            .option('-i, --input <input>', 'Input data (JSON)')
            .addOption(CommonOptions.output())
            .action(async (source: string, target: string, options) => {
                try {
                    this.logger?.debug('Starting graph translation', { source, target });
                    const bridge = this.registry.getBridge(source, target);
                    if (!bridge) {
                        this.logger?.error('No bridge found', new Error('Bridge not found'), { source, target });
                        console.error(`No bridge found from '${source}' to '${target}'`);
                        return;
                    }

                    const inputData = JSON.parse(options.input);
                    const bridgeComponent = new BridgeComponent(bridge, this.registry);
                    const result = await bridgeComponent.execute({
                        source,
                        target,
                        data: inputData
                    });

                    if (options.output) {
                        fs.writeFileSync(options.output, JSON.stringify(result.data, null, 2));
                        console.log(`Translation saved to ${options.output}`);
                    } else {
                        console.log('\nTranslation Result:');
                        console.log(JSON.stringify(result.data, null, 2));
                    }

                    this.logger?.info('Graph translation completed', { source, target, output: options.output });
                } catch (error) {
                    this.logger?.error('Graph translation failed', error as Error, { source, target });
                    console.error('Error during translation:', error);
                }
            });

        // Normalize to standard model
        graphCommand
            .command('normalize <source> <model>')
            .description('Normalize external graph to standard model')
            .option('-i, --input <input>', 'Input data (JSON)')
            .addOption(CommonOptions.output())
            .action(async (source: string, model: string, options) => {
                try {
                    this.logger?.debug('Starting graph normalization', { source, model });
                    const bridge = this.registry.getBridge(source, model);
                    if (!bridge) {
                        this.logger?.error('No normalization bridge found', new Error('Bridge not found'), { source, model });
                        console.error(`No bridge found from '${source}' to standard model '${model}'`);
                        return;
                    }

                    const inputData = JSON.parse(options.input);
                    const bridgeComponent = new BridgeComponent(bridge, this.registry);
                    const result = await bridgeComponent.execute({
                        source,
                        target: model,
                        data: inputData
                    });

                    if (options.output) {
                        fs.writeFileSync(options.output, JSON.stringify(result.data, null, 2));
                        console.log(`Normalized data saved to ${options.output}`);
                    } else {
                        console.log('\nNormalized Result:');
                        console.log(JSON.stringify(result.data, null, 2));
                    }

                    this.logger?.info('Graph normalization completed', { source, model, output: options.output });
                } catch (error) {
                    this.logger?.error('Graph normalization failed', error as Error, { source, model });
                    console.error('Error during normalization:', error);
                }
            });

        // Discover compatible models
        graphCommand
            .command('discover')
            .description('Find compatible graph models')
            .option('-m, --model <model>', 'Source model to check compatibility')
            .action((options) => {
                this.logger?.debug('Discovering compatible graph models', { model: options.model });
                const bridges = this.registry.getBridges();
                const compatibleModels = new Set<string>();

                bridges.forEach((bridge: any) => {
                    if (options.model) {
                        if (bridge.source === options.model) {
                            compatibleModels.add(bridge.target);
                        } else if (bridge.target === options.model) {
                            compatibleModels.add(bridge.source);
                        }
                    } else {
                        compatibleModels.add(bridge.source);
                        compatibleModels.add(bridge.target);
                    }
                });

                if (compatibleModels.size === 0) {
                    console.log('No compatible models found');
                    return;
                }

                console.log('\nCompatible Models:');
                Array.from(compatibleModels).forEach(model => {
                    console.log(`- ${model}`);
                });

                this.logger?.info('Graph model discovery completed', {
                    sourceModel: options.model,
                    compatibleCount: compatibleModels.size
                });
            });
    }
} 