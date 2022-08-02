import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	NodeApiError
} from 'n8n-workflow';

export async function opencellApi(this: IHookFunctions | IWebhookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	const requestOptions: OptionsWithUri = {
		method,
		headers: {},
		uri : '',
		body,
		json: true,
	};
	
	if (query) {
		requestOptions.qs = query;
	}

	try {
		const authenticationMethod = this.getNodeParameter('authentication', 0);
		// @ts-ignore
		let responseData:IDataObject = {};

		if(authenticationMethod === 'basicAuth') {
			const httpBasicAuth = await this.getCredentials('opencellApi');
			requestOptions.auth = {
				username: httpBasicAuth.username as string,
				password: httpBasicAuth.password as string,
			};
			requestOptions.uri = `${httpBasicAuth.host}:${httpBasicAuth.port}${endpoint}`;
			responseData = await this.helpers.request!(requestOptions);
		}
		else if (authenticationMethod === 'oAuth2') {
			const credentials = await this.getCredentials('opencellOAuth2Api');
			requestOptions.uri = `${credentials.host}:${credentials.port}${endpoint}`;
			responseData = await this.helpers.requestOAuth2!.call(this, 'opencellOAuth2Api', requestOptions, { tokenType: 'Bearer', includeCredentialsOnRefreshOnBody: true });
		}

		// To return an array when it is a generic API get list
		if ('POST' === method && responseData.data) {
			returnData.push.apply(returnData, responseData.data as IDataObject[]);
			return returnData;
		}
		return responseData;
	} catch (error) {
		if (error.response) {
			const errorMessage = error.response.data.message || error.response.data.errorCode || error.response.data.status;
			throw new NodeApiError(this.getNode(), {error : `Opencell error response [${error.response.status}]: ${errorMessage}`});
		}
		throw error;
	}


}

export async function validateCredentials(this: ICredentialTestFunctions ,decryptedCredentials: ICredentialDataDecryptedObject): Promise<INodeCredentialTestResult> {

	const credentials = decryptedCredentials;
	const requestOptions: IHttpRequestOptions = {
		method: 'GET',
		headers: {Accept: 'application/json',},
		url: '',
		json: true,
	};

	requestOptions.auth = {
		username: credentials.username as string,
		password: credentials.password as string,
	};
	requestOptions.url = `${credentials.host}:${credentials.port}`;
	requestOptions.url += '/opencell/api/rest/catalog/version';
	requestOptions.method = 'GET';

	return await this.helpers.request(requestOptions);
}

export function convertCustomFields(executeFunction: IExecuteFunctions, customFieldsValues : IDataObject[]) {
	const convertedCustomFields:IDataObject[] = [];

	for(const cf of customFieldsValues) {

		const currentCf:IDataObject = {
			code:cf.code,
			fieldType: cf.fieldType,
		};

		switch(String(cf.fieldType)) {
			case 'LIST':
			case 'CHECKBOX_LIST':
				//convert list values to the format expected by the api aka "value":[{"value":"VAL1"},{"value":"VAL2"}]
				const valueField = cf.value as string[];
				if(valueField && valueField.toString() !== '') {
					//Multiple values case
					if(Array.isArray(valueField)) {
						const valueList:IDataObject[] = [];
						for(const value of valueField) {
							valueList.push({
								'value':value,
							});
						}
						currentCf.value = valueList;
					}
					//Single values case
					else {
						const value = cf.value;
						currentCf.value = [{
							'value':value,
						}];
					}
				}
				break;
			case 'STRING':
			case 'TEXT_AREA':
				currentCf.stringValue = cf.stringValue;
				break;
			case 'DATE':
				currentCf.dateValue = cf.dateValue;
				break;
			case 'BOOLEAN':
				currentCf.booleanValue = cf.booleanValue;
				break;
			case 'LONG':
				currentCf.longValue = cf.longValue;
				break;
			case 'DOUBLE':
				currentCf.doubleValue = cf.doubleValue;
				break;
			default:
				throw new NodeApiError(executeFunction.getNode(), {error: `Custom field type unsupported: ${cf.type}`});
		}
		if(cf.code) {
			//Remove everything after | in 'code'
			currentCf.code = String(cf.code).split('|')[0];
		}

		convertedCustomFields.push(currentCf);

	}

	return convertedCustomFields;
}