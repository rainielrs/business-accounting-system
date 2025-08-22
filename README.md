
# Business Accounting System

A comprehensive business accounting system built with Node.js, Express, and PostgreSQL.

## Features

- 📊 Dashboard with business overview
- 👥 Customer management
- 🏪 Supplier management
- 📦 Inventory tracking
- 💰 Cash flow management
- 🔄 Returns processing
- ⚙️ Settings management

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd accounting-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure database**
   - Create a PostgreSQL database
   - Update `.env` file with your database credentials

4. **Run migrations**
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Project Structure

```
accounting-system/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   └── utils/
├── public/
├── views/
├── .env
├── package.json
└── README.md
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run test` - Run tests
- `npm run lint` - Run linter

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/accounting_db
JWT_SECRET=your_jwt_secret_key
```

### Database Schema

The system uses PostgreSQL with the following main tables:
- users
- customers
- suppliers
- products
- transactions
- inventory
- returns

### API Endpoints

#### Authentication
- POST /api/auth/login
- POST /api/auth/register

#### Customers
- GET /api/customers
- POST /api/customers
- GET /api/customers/:id
- PUT /api/customers/:id
- DELETE /api/customers/:id

#### Suppliers
- GET /api/suppliers
- POST /api/suppliers
- GET /api/suppliers/:id
- PUT /api/suppliers/:id
- DELETE /api/suppliers/:id

#### Products
- GET /api/products
- POST /api/products
- GET /api/products/:id
- PUT /api/products/:id
- DELETE /api/products/:id

#### Transactions
- GET /api/transactions
- POST /api/transactions
- GET /api/transactions/:id
- PUT /api/transactions/:id
- DELETE /api/transactions/:id

#### Inventory
- GET /api/inventory
- POST /api/inventory
- GET /api/inventory/:id
- PUT /api/inventory/:id
- DELETE /api/inventory/:id

#### Returns
- GET /api/returns
- POST /api/returns
- GET /api/returns/:id
- PUT /api/returns/:id
- DELETE /api/returns/:id

### Testing

The system includes unit and integration tests using Jest:

```bash
npm run test
```

### Deployment

To deploy to production:

1. Set `NODE_ENV=production` in your environment
2. Configure your production database
3. Build the application:
   ```bash
   npm run build
   ```
4. Start the server:
   ```bash
   npm start
   ```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### License

This project is licensed under the MIT License - see the LICENSE file for details.
