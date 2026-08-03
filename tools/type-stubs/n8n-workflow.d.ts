declare module 'n8n-workflow' {
  export type Icon = string | { light: string; dark: string };
  export interface ICredentialType { name: string; displayName: string; icon?: Icon; documentationUrl?: string; properties: INodeProperties[]; }
  export interface INodeProperties { [key: string]: unknown; }
  export interface ICredentialDataDecryptedObject { [key: string]: unknown; }
  export interface ICredentialsDecrypted { data: ICredentialDataDecryptedObject; }
  export type ICredentialTestFunctions = object;
  export interface INodeCredentialTestResult { status: 'OK' | 'Error'; message: string; }
  export interface IDataObject { [key: string]: unknown; }
  export interface INode { name: string; type: string; typeVersion: number; position: [number, number]; parameters: IDataObject; }
  export interface INodeExecutionData { json: IDataObject; pairedItem?: { item: number }; }
  export interface INodeTypeDescription { [key: string]: unknown; }
  export interface INodeType {
    description: INodeTypeDescription;
    methods?: unknown;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  }
  export interface IExecuteFunctions {
    getInputData(): INodeExecutionData[];
    getCredentials(name: string): Promise<ICredentialDataDecryptedObject>;
    getNodeParameter(name: string, index: number, fallback?: unknown): unknown;
    getNode(): INode;
    continueOnFail(): boolean;
  }
  export const NodeConnectionTypes: { readonly Main: 'main' };
  export class NodeOperationError extends Error {
    constructor(node: INode, error: Error | string, options?: { itemIndex?: number; description?: string });
  }
}
