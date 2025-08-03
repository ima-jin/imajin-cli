import { Command } from 'commander';
import { DefaultBridgeRegistry, BridgeComponent } from '../../etl/bridges.js';

export class GraphCommand {
    private readonly registry: DefaultBridgeRegistry;

    constructor() {
        this.registry = new DefaultBridgeRegistry();
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
            .option('-o, --output <output>', 'Output file path')
            .action(async (source: string, target: string, options) => {
                try {
                    const bridge = this.registry.getBridge(source, target);
                    if (!bridge) {
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
                        const fs = require('fs');
                        fs.writeFileSync(options.output, JSON.stringify(result.data, null, 2));
                        console.log(`Translation saved to ${options.output}`);
                    } else {
                        console.log('\nTranslation Result:');
                        console.log(JSON.stringify(result.data, null, 2));
                    }
                } catch (error) {
                    console.error('Error during translation:', error);
                }
            });

        // Normalize to standard model
        graphCommand
            .command('normalize <source> <model>')
            .description('Normalize external graph to standard model')
            .option('-i, --input <input>', 'Input data (JSON)')
            .option('-o, --output <output>', 'Output file path')
            .action(async (source: string, model: string, options) => {
                try {
                    const bridge = this.registry.getBridge(source, model);
                    if (!bridge) {
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
                        const fs = require('fs');
                        fs.writeFileSync(options.output, JSON.stringify(result.data, null, 2));
                        console.log(`Normalized data saved to ${options.output}`);
                    } else {
                        console.log('\nNormalized Result:');
                        console.log(JSON.stringify(result.data, null, 2));
                    }
                } catch (error) {
                    console.error('Error during normalization:', error);
                }
            });

        // Discover compatible models
        graphCommand
            .command('discover')
            .description('Find compatible graph models')
            .option('-m, --model <model>', 'Source model to check compatibility')
            .action((options) => {
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
            });
    }
} 