import { INodeProperties } from "n8n-workflow";

export const AccountHierarchyOperations:INodeProperties[] = [

    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: [
                    'accountHierarchy',
                ],
            },
        },
        options: [
            {
                name: 'Search',
                value: 'search',
                description: 'Search for a list of customer accounts given a set of filters',
            }
        ],
        default: 'search',
    }

]