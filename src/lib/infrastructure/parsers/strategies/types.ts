export interface ParserResult<T> {
  data: T;
  strategyUsed: string;
  success: boolean;
}

export interface IParserStrategy<T> {
  parse(html: string): ParserResult<T>;
}
