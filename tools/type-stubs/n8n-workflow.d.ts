declare module 'n8n-workflow' {
  export interface ICredentialType { name: string; displayName: string; documentationUrl?: string; properties: INodeProperties[]; }
  export interface INodeProperties { [key: string]: unknown; }
  export interface ICredentialDataDecryptedObject { [key: string]: unknown; }
  export interface IDataObject { [key: string]: unknown; }
  export interface INodeExecutionData { json: IDataObject; pairedItem?: { item: number }; }
  export interface INodeTypeDescription { [key: string]: unknown; }
  export interface INodeType { description: INodeTypeDescription; execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>; }
  export interface IExecuteFunctions {
    getInputData(): INodeExecutionData[];
    getCredentials(name: string): Promise<ICredentialDataDecryptedObject>;
    getNodeParameter(name: string, index: number, fallback?: unknown): unknown;
    getNode(): unknown;
    continueOnFail(): boolean;
  }
  export enum NodeConnectionType { Main = 'main' }
  export class NodeOperationError extends Error {
    constructor(node: unknown, error: Error | string, options?: { itemIndex?: number });
  }
}
