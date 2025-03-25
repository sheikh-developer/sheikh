# GitHub Follower Automation

A modern, serverless GitHub follower automation system with intelligent rate limiting and activity checking.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsheikh-developer%2Fsheikh)

## Features

- 🚀 **Serverless Architecture**: Built with Next.js and Vercel
- 🎯 **Intelligent Following**: Follows only active GitHub users
- ⚡ **Rate Limiting**: Smart rate limit handling and anti-detection measures
- 📊 **Real-time Dashboard**: Monitor your automation in real-time
- 🔒 **Secure**: Environment-based configuration
- 🛡️ **Anti-Detection**: Built-in measures to prevent account detection

## Live Demo

Visit [sheikh-follow.vercel.app](https://sheikh-follow.vercel.app) to see the live dashboard.

## Prerequisites

- Node.js 18.x or later
- GitHub Personal Access Token with `user:follow` scope
- Vercel account (for deployment)

## Configuration

1. Clone the repository:
```bash
git clone https://github.com/sheikh-developer/sheikh.git
cd sheikh
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
GITHUB_TOKEN=your_github_token
TARGET_USER=target_username
```

## Development

Run the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Deployment

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add your environment variables in Vercel's project settings
4. Deploy!

## Features in Detail

### Rate Limiting
- Maximum 20 follows per minute
- Minimum 3-second delay between follows
- Automatic rate limit detection and handling
- 6-hour cycle interval

### Activity Checking
- Minimum 3 repositories
- At least 5 public events
- At least 1 star on repositories
- At least 1 follower
- Active within last 30 days

### Anti-Detection
- Random delays between actions
- User agent spoofing
- Cool-down periods
- Maximum consecutive actions limit

### Monitoring
- Real-time dashboard updates
- Rate limit status
- Error tracking
- Processing statistics

## API Endpoints

### GET /api/follow
Initiates the follower automation process.

Response:
```json
{
  "followed": string[],
  "processed": string[],
  "total_processed": number,
  "rate_limit_hits": number,
  "errors": number,
  "consecutive_actions": number,
  "timestamp": string
}
```

### GET /api/rate-limit
Checks current GitHub API rate limits.

Response:
```json
{
  "remaining": number,
  "reset": number,
  "limit": number,
  "resources": {
    "core": { "limit": number, "remaining": number, "reset": number },
    "search": { "limit": number, "remaining": number, "reset": number },
    "graphql": { "limit": number, "remaining": number, "reset": number }
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

- GitHub: [@sheikh-developer](https://github.com/sheikh-developer)
- Website: [sheikh-follow.vercel.app](https://sheikh-follow.vercel.app)