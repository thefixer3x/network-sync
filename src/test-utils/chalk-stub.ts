type ChalkFn = (input: unknown) => string;

const passthrough: ChalkFn = (input) =>
  typeof input === 'string' ? input : String(input ?? '');

const handler: ProxyHandler<ChalkFn> = {
  get: () => new Proxy(passthrough, handler),
  apply: (_target, _thisArg, args) => passthrough(args[0]),
};

const chalkStub = new Proxy(passthrough, handler);

export default chalkStub;
