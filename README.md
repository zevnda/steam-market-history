# Steam Market History Calculator

A command-line tool to calculate the total value of your Steam Market sale history. This utility fetches your Steam Market history and calculates the total value of all your sales along with providing insights into your most valuable transactions

## Installation

### Prerequisites

- Node.js (v14 or higher)
- pnpm (or npm/yarn)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/zevnda/steam-market-history.git
   cd steam-market-history
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the project:
   ```bash
   pnpm build
   ```

## Usage

Run the CLI using:

```bash
pnpm start
```

For verbose logging (useful for debugging):

```bash
pnpm start --verbose
```

## Authentication

The application requires authentication to access your Steam Market history. You'll need to provide the following cookies from your Steam session:

- `sessionid`
- `steamLoginSecure`

And optionally:
- `steamMachineAuth` (if present in cookies list)
- `steamParental` (if you have [Steam Family View](https://store.steampowered.com/parental/) enabled)

### How to Find Your Steam Cookies

1. Go to [https://steamcommunity.com/](https://steamcommunity.com/) and sign in
2. Open the browser Developer Tools (F12)
3. Navigate to the Application *(Chrome)* or Storage *(Firefox)* tab
4. Find Cookies in the left panel and select the `steamcommunity.com` domain
5. Find and copy the values for the required cookies

### Saved Authentication

The application offers to save your authentication details in a `.env` file for future use. These details are stored locally and are not uploaded anywhere

**Note:** The `.env` file contains sensitive information. Do not share it with others or commit it to version control

To use saved authentication:
- When prompted, type `y` to use existing saved authentication
- To use new credentials instead, type `n`

To delete saved authentication:
- If authentication fails with saved data, you'll be offered to delete the saved data
- Type `y` to delete the saved authentication details

## How It Works

1. The tool uses your Steam authentication cookies to access your market history
2. It paginates through all available market history pages (500 items per request)
3. For each page, it parses the `results_html` property to extract item names and prices
4. The results are aggregated and sorted by value
5. The total market value along with your top 10 most valuable transaction are displayed

## Troubleshooting

### Authentication Issues

- Make sure you've copied the correct cookie values
  - You must get the cookie values from `https://steamcommunity.com/` and not `https://store.steampowered.com/`
- Cookies expire periodically, so you may need to get fresh values
- If using saved authentication that no longer works, delete it when prompted

### Rate Limiting

- Steam may rate-limit requests if you have a very large market history
- The tool adds a 3-second delay between requests to mitigate this but it's not a perfect solution
- If you encounter rate limiting, try again later

## License

Copyright © 2025 zevnda — **[GPL-3.0 License](./LICENSE)**
