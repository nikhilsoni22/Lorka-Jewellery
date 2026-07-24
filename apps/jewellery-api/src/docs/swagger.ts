import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const authBody = (schema: string) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
});

const okResponse = { description: 'Success' };

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Lorka Jewellers API',
    version: '1.0.0',
    description: 'Phase 1 (auth) + Phase 2 (product/category/banner catalog).',
  },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Auth' }, { name: 'System' }, { name: 'Categories' }, { name: 'Products' }, { name: 'Banners' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', example: 'jane@example.com' },
          password: { type: 'string', example: 'Secret123' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@lorka.com' },
          password: { type: 'string', example: 'Admin@12345' },
          rememberMe: { type: 'boolean', example: false },
        },
      },
      ForgotPasswordInput: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', example: 'jane@example.com' } },
      },
      ResetPasswordInput: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', example: 'NewSecret123' },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Silver Rings' },
          description: { type: 'string' },
          image: { type: 'string', example: 'https://res.cloudinary.com/demo/image.jpg' },
          isFeatured: { type: 'boolean' },
          isActive: { type: 'boolean' },
          sortOrder: { type: 'integer' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'category', 'sku', 'metalType', 'weight', 'images'],
        properties: {
          name: { type: 'string', example: 'Classic Silver Band Ring' },
          description: { type: 'string' },
          category: { type: 'string', example: '65f0c0c0c0c0c0c0c0c0c0c0' },
          sku: { type: 'string', example: 'RNG-001' },
          metalType: { type: 'string', enum: ['silver', 'gold'], example: 'silver' },
          makingCharge: { type: 'number', example: 200 },
          discountPercent: {
            type: 'number',
            example: 15,
            description: 'Optional offer, as a percentage (1-100) of the calculated price',
          },
          images: { type: 'array', items: { type: 'string' } },
          material: { type: 'string', example: 'Sterling Silver' },
          purity: { type: 'string', example: '925' },
          weight: {
            type: 'number',
            example: 4.2,
            description: 'Grams — price is derived live as weight × the admin-set metal rate + makingCharge',
          },
          stock: { type: 'integer', example: 25 },
          isFeatured: { type: 'boolean' },
          isActive: { type: 'boolean' },
        },
      },
      BannerInput: {
        type: 'object',
        required: ['title', 'image', 'placement'],
        properties: {
          title: { type: 'string', example: 'Festive Silver Collection' },
          subtitle: { type: 'string' },
          image: { type: 'string' },
          href: { type: 'string', example: '/collections/festive' },
          placement: { type: 'string', enum: ['hero', 'promo'] },
          sortOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Health check', responses: { 200: okResponse } },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a customer',
        requestBody: authBody('RegisterInput'),
        responses: { 201: okResponse, 409: { description: 'Email already exists' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Customer login',
        requestBody: authBody('LoginInput'),
        responses: { 200: okResponse, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login (rejects non-admin roles)',
        requestBody: authBody('LoginInput'),
        responses: {
          200: okResponse,
          401: { description: 'Invalid credentials' },
          403: { description: 'Not an admin account' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token → new access token',
        responses: { 200: okResponse, 401: { description: 'Invalid/expired refresh token' } },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoke the current refresh token', responses: { 200: okResponse } },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { 200: okResponse, 401: { description: 'Unauthorized' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset link',
        requestBody: authBody('ForgotPasswordInput'),
        responses: { 200: okResponse },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using a token',
        requestBody: authBody('ResetPasswordInput'),
        responses: { 200: okResponse, 400: { description: 'Invalid/expired token' } },
      },
    },
    '/categories': {
      get: { tags: ['Categories'], summary: 'List categories (public)', responses: { 200: okResponse } },
      post: {
        tags: ['Categories'],
        summary: 'Create a category (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: authBody('CategoryInput'),
        responses: { 201: okResponse, 403: { description: 'Admin role required' } },
      },
    },
    '/categories/slug/{slug}': {
      get: {
        tags: ['Categories'],
        summary: 'Get a category by slug (public)',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
    },
    '/categories/{id}': {
      put: {
        tags: ['Categories'],
        summary: 'Update a category (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: authBody('CategoryInput'),
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (public, paginated/filterable)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'name_asc'] } },
        ],
        responses: { 200: okResponse },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: authBody('ProductInput'),
        responses: { 201: okResponse, 409: { description: 'SKU already exists' } },
      },
    },
    '/products/slug/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Get a product by slug (public)',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
    },
    '/products/{id}': {
      put: {
        tags: ['Products'],
        summary: 'Update a product (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: authBody('ProductInput'),
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a product (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
    },
    '/banners': {
      get: {
        tags: ['Banners'],
        summary: 'List active, in-schedule banners (public)',
        parameters: [{ name: 'placement', in: 'query', schema: { type: 'string', enum: ['hero', 'promo'] } }],
        responses: { 200: okResponse },
      },
      post: {
        tags: ['Banners'],
        summary: 'Create a banner (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: authBody('BannerInput'),
        responses: { 201: okResponse },
      },
    },
    '/banners/all': {
      get: {
        tags: ['Banners'],
        summary: 'List every banner regardless of state (admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: okResponse },
      },
    },
    '/banners/{id}': {
      put: {
        tags: ['Banners'],
        summary: 'Update a banner (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: authBody('BannerInput'),
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Banners'],
        summary: 'Delete a banner (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: okResponse, 404: { description: 'Not found' } },
      },
    },
  },
} as const;

export function mountSwagger(app: Express, basePath: string): void {
  app.use(`${basePath}/docs`, swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get(`${basePath}/docs.json`, (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });
}
