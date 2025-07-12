1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Create a new project named "VotingApp"
4. Click "Build a Cluster" > select "Shared" (free tier)
5. Choose your preferred cloud provider and region
6. Click "Create Cluster" (wait 1-3 minutes for creation)
7. Under "Security" tab, click "Database Access" > "Add New Database User"
   - Username: voting_app_user
   - Password: create a secure password
   - Role: Atlas Admin (for development)
8. Under "Network Access" > "Add IP Address" > select "Allow Access from Anywhere" for development
9. Once cluster is ready, click "Connect" > "Connect your application"
10. Copy the connection string (looks like: `mongodb+srv://voting_app_user:<password>@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`)
