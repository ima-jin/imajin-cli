/**
 * ContentfulTestData - Test data factory for Contentful CMS objects
 *
 * @package     @imajin/cli
 * @subpackage  test/factories
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-02
 *
 * Integration Points:
 * - Contentful service testing
 * - HTTP mock response data
 * - Integration test fixtures
 */

export class ContentfulTestData {
    /**
     * Create mock Contentful entry
     */
    static createEntry(overrides?: Partial<ContentfulEntry>): ContentfulEntry {
        return {
            sys: {
                space: {
                    sys: {
                        type: 'Link',
                        linkType: 'Space',
                        id: 'test-space-123'
                    }
                },
                id: 'test-entry-123',
                type: 'Entry',
                createdAt: '2025-01-02T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z',
                environment: {
                    sys: {
                        id: 'master',
                        type: 'Link',
                        linkType: 'Environment'
                    }
                },
                revision: 1,
                contentType: {
                    sys: {
                        type: 'Link',
                        linkType: 'ContentType',
                        id: 'testContentType'
                    }
                },
                locale: 'en-US'
            },
            fields: {
                title: 'Test Entry Title',
                description: 'This is a test entry for integration testing',
                slug: 'test-entry-slug',
                publishedAt: '2025-01-02T00:00:00.000Z',
                featuredImage: {
                    sys: {
                        type: 'Link',
                        linkType: 'Asset',
                        id: 'test-asset-123'
                    }
                },
                tags: ['test', 'integration', 'sample'],
                content: {
                    nodeType: 'document',
                    data: {},
                    content: [
                        {
                            nodeType: 'paragraph',
                            data: {},
                            content: [
                                {
                                    nodeType: 'text',
                                    value: 'This is sample rich text content for testing.',
                                    marks: [],
                                    data: {}
                                }
                            ]
                        }
                    ]
                }
            },
            metadata: {
                tags: []
            },
            ...overrides
        };
    }

    /**
     * Create mock Contentful asset
     */
    static createAsset(overrides?: Partial<ContentfulAsset>): ContentfulAsset {
        return {
            sys: {
                space: {
                    sys: {
                        type: 'Link',
                        linkType: 'Space',
                        id: 'test-space-123'
                    }
                },
                id: 'test-asset-123',
                type: 'Asset',
                createdAt: '2025-01-02T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z',
                environment: {
                    sys: {
                        id: 'master',
                        type: 'Link',
                        linkType: 'Environment'
                    }
                },
                revision: 1,
                locale: 'en-US'
            },
            fields: {
                title: 'Test Image Asset',
                description: 'A test image for integration testing',
                file: {
                    url: '//images.ctfassets.net/test-space-123/test-asset-123/test-image.jpg',
                    details: {
                        size: 245760,
                        image: {
                            width: 1200,
                            height: 800
                        }
                    },
                    fileName: 'test-image.jpg',
                    contentType: 'image/jpeg'
                }
            },
            metadata: {
                tags: []
            },
            ...overrides
        };
    }

    /**
     * Create mock Contentful content type
     */
    static createContentType(overrides?: Partial<ContentfulContentType>): ContentfulContentType {
        return {
            sys: {
                space: {
                    sys: {
                        type: 'Link',
                        linkType: 'Space',
                        id: 'test-space-123'
                    }
                },
                id: 'testContentType',
                type: 'ContentType',
                createdAt: '2025-01-02T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z',
                environment: {
                    sys: {
                        id: 'master',
                        type: 'Link',
                        linkType: 'Environment'
                    }
                },
                revision: 1
            },
            displayField: 'title',
            name: 'Test Content Type',
            description: 'A test content type for integration testing',
            fields: [
                {
                    id: 'title',
                    name: 'Title',
                    type: 'Symbol',
                    localized: false,
                    required: true,
                    validations: [
                        {
                            size: {
                                min: 1,
                                max: 200
                            }
                        }
                    ],
                    disabled: false,
                    omitted: false
                },
                {
                    id: 'description',
                    name: 'Description',
                    type: 'Text',
                    localized: false,
                    required: false,
                    validations: [],
                    disabled: false,
                    omitted: false
                },
                {
                    id: 'slug',
                    name: 'Slug',
                    type: 'Symbol',
                    localized: false,
                    required: true,
                    validations: [
                        {
                            unique: true
                        },
                        {
                            regexp: {
                                pattern: '^[a-z0-9-]+$'
                            }
                        }
                    ],
                    disabled: false,
                    omitted: false
                },
                {
                    id: 'content',
                    name: 'Content',
                    type: 'RichText',
                    localized: false,
                    required: false,
                    validations: [],
                    disabled: false,
                    omitted: false
                },
                {
                    id: 'featuredImage',
                    name: 'Featured Image',
                    type: 'Link',
                    localized: false,
                    required: false,
                    validations: [
                        {
                            linkContentType: ['image']
                        }
                    ],
                    disabled: false,
                    omitted: false,
                    linkType: 'Asset'
                }
            ],
            ...overrides
        };
    }

    /**
     * Create mock Contentful space
     */
    static createSpace(overrides?: Partial<ContentfulSpace>): ContentfulSpace {
        return {
            sys: {
                type: 'Space',
                id: 'test-space-123',
                version: 1,
                createdAt: '2025-01-02T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z'
            },
            name: 'Test Space',
            locales: [
                {
                    code: 'en-US',
                    name: 'English (United States)',
                    default: true,
                    fallbackCode: null,
                    sys: {
                        id: 'test-locale-123',
                        type: 'Locale',
                        version: 1
                    }
                }
            ],
            ...overrides
        };
    }

    /**
     * Create mock Contentful query response
     */
    static createQueryResponse<T>(items: T[], total?: number): ContentfulQueryResponse<T> {
        return {
            sys: {
                type: 'Array'
            },
            total: total || items.length,
            skip: 0,
            limit: 100,
            items,
            includes: {
                Asset: [],
                Entry: []
            }
        };
    }

    /**
     * Create mock Contentful error
     */
    static createError(status: number = 400, message: string = 'Bad Request'): ContentfulError {
        return {
            sys: {
                id: 'BadRequest',
                type: 'Error'
            },
            message,
            details: {
                errors: [
                    {
                        name: 'unknown',
                        value: 'invalid',
                        details: message
                    }
                ]
            },
            requestId: 'test-request-123'
        };
    }

    /**
     * Create mock rich text document
     */
    static createRichTextDocument(content?: string): ContentfulRichTextDocument {
        return {
            nodeType: 'document',
            data: {},
            content: [
                {
                    nodeType: 'paragraph',
                    data: {},
                    content: [
                        {
                            nodeType: 'text',
                            value: content || 'Sample rich text content for testing purposes.',
                            marks: [],
                            data: {}
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Create mock Contentful environment
     */
    static createEnvironment(overrides?: Partial<ContentfulEnvironment>): ContentfulEnvironment {
        return {
            sys: {
                id: 'master',
                type: 'Environment',
                version: 1,
                createdAt: '2025-01-02T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z',
                space: {
                    sys: {
                        type: 'Link',
                        linkType: 'Space',
                        id: 'test-space-123'
                    }
                }
            },
            name: 'master',
            ...overrides
        };
    }
}

// Type definitions for Contentful objects (simplified for testing)
export interface ContentfulEntry {
    sys: {
        space: any;
        id: string;
        type: 'Entry';
        createdAt: string;
        updatedAt: string;
        environment: any;
        revision: number;
        contentType: any;
        locale: string;
    };
    fields: Record<string, any>;
    metadata: {
        tags: any[];
    };
}

export interface ContentfulAsset {
    sys: {
        space: any;
        id: string;
        type: 'Asset';
        createdAt: string;
        updatedAt: string;
        environment: any;
        revision: number;
        locale: string;
    };
    fields: {
        title: string;
        description?: string;
        file: {
            url: string;
            details: {
                size: number;
                image?: {
                    width: number;
                    height: number;
                };
            };
            fileName: string;
            contentType: string;
        };
    };
    metadata: {
        tags: any[];
    };
}

export interface ContentfulContentType {
    sys: any;
    displayField: string;
    name: string;
    description?: string;
    fields: Array<{
        id: string;
        name: string;
        type: string;
        localized: boolean;
        required: boolean;
        validations: any[];
        disabled: boolean;
        omitted: boolean;
        linkType?: string;
    }>;
}

export interface ContentfulSpace {
    sys: {
        type: 'Space';
        id: string;
        version: number;
        createdAt: string;
        updatedAt: string;
    };
    name: string;
    locales: Array<{
        code: string;
        name: string;
        default: boolean;
        fallbackCode: string | null;
        sys: any;
    }>;
}

export interface ContentfulQueryResponse<T> {
    sys: {
        type: 'Array';
    };
    total: number;
    skip: number;
    limit: number;
    items: T[];
    includes: {
        Asset: any[];
        Entry: any[];
    };
}

export interface ContentfulError {
    sys: {
        id: string;
        type: 'Error';
    };
    message: string;
    details: {
        errors: Array<{
            name: string;
            value: any;
            details: string;
        }>;
    };
    requestId: string;
}

export interface ContentfulRichTextDocument {
    nodeType: 'document';
    data: Record<string, any>;
    content: Array<{
        nodeType: string;
        data: Record<string, any>;
        content: Array<{
            nodeType: string;
            value?: string;
            marks: any[];
            data: Record<string, any>;
        }>;
    }>;
}

export interface ContentfulEnvironment {
    sys: {
        id: string;
        type: 'Environment';
        version: number;
        createdAt: string;
        updatedAt: string;
        space: any;
    };
    name: string;
} 