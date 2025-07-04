import { ETLServiceProvider } from '../../../etl/providers/ETLServiceProvider';
import { Container } from '../../../container/Container';
import { Command } from 'commander';
import { EventManager } from '../../../core/events/EventManager';
import { Logger } from '../../../logging/Logger';
import { DefaultBridgeRegistry } from '../../../etl/bridges/DefaultBridgeRegistry';
import { ETLPipeline } from '../../../etl/core/ETLPipeline';

describe('ETLServiceProvider', () => {
    let provider: ETLServiceProvider;
    let container: Container;
    let program: Command;
    let eventManager: EventManager;
    let logger: Logger;

    beforeEach(() => {
        container = new Container();
        program = new Command();
        eventManager = new EventManager();
        logger = new Logger();

        container.singleton('eventManager', () => eventManager);
        container.singleton('logger', () => logger);

        provider = new ETLServiceProvider(container, program);
    });

    describe('getName', () => {
        it('should return correct service name', () => {
            expect(provider.getName()).toBe('etl');
        });
    });

    describe('register', () => {
        it('should register core ETL services', () => {
            provider.register();

            const bridgeRegistry = container.resolve('etl.bridgeRegistry') as DefaultBridgeRegistry;
            const pipeline = container.resolve('etl.pipeline') as ETLPipeline;
            
            expect(bridgeRegistry).toBeDefined();
            expect(pipeline).toBeDefined();
            expect(bridgeRegistry.constructor.name).toBe('DefaultBridgeRegistry');
            expect(pipeline.constructor.name).toBe('ETLPipeline');
        });

        it('should register bridge component factory', () => {
            provider.register();

            const factory = container.resolve('etl.bridgeComponent');
            expect(typeof factory).toBe('function');
        });
    });

    describe('boot', () => {
        it('should initialize bridge registry', () => {
            provider.register();
            
            const bridgeRegistry = container.resolve<DefaultBridgeRegistry>('etl.bridgeRegistry');

            if (bridgeRegistry && typeof bridgeRegistry.initialize === 'function') {
                const initBridgeRegistrySpy = jest.spyOn(bridgeRegistry, 'initialize').mockImplementation(() => {});
                
                provider.boot();
                
                expect(initBridgeRegistrySpy).toHaveBeenCalled();
            } else {
                provider.boot();
            }
        });

        it('should register event listeners', () => {
            const registerSpy = jest.spyOn(eventManager, 'registerListener');
            const logSpy = jest.spyOn(logger, 'info');

            provider.boot();

            expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'etl.bridge.registered'
            }), expect.any(Object));
            expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'etl.pipeline.started'
            }), expect.any(Object));
            expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'etl.pipeline.completed'
            }), expect.any(Object));
        });
    });

    describe('registerCommands', () => {
        it('should register ETL commands', () => {
            const commandSpy = jest.spyOn(program, 'command');

            provider.registerCommands(program);

            expect(commandSpy).toHaveBeenCalledWith('etl');
            expect(commandSpy).toHaveBeenCalledWith('bridge');
        });
    });

    describe('getServices', () => {
        it('should return list of provided services', () => {
            const services = provider.getServices();

            expect(services).toContain('etl.bridgeRegistry');
            expect(services).toContain('etl.pipeline');
            expect(services).toContain('etl.bridgeComponent');
        });
    });

    describe('provides', () => {
        it('should correctly identify provided services', () => {
            expect(provider.provides('etl.bridgeRegistry')).toBe(true);
            expect(provider.provides('etl.pipeline')).toBe(true);
            expect(provider.provides('etl.bridgeComponent')).toBe(true);
            expect(provider.provides('unknown.service')).toBe(false);
        });
    });
}); 