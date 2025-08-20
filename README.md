# Zuexis - AI Content Repurposing Platform

A modern web application that transforms long-form videos into viral short clips using AI.

## 🚀 Features

- **AI-Powered Content Repurposing**: Automatically finds the best moments in videos
- **Multi-Platform Optimization**: Creates clips optimized for TikTok, YouTube Shorts, Instagram Reels
- **Smart Captions & Hashtags**: AI-generated captions and hashtags for maximum engagement
- **Modern UI/UX**: Beautiful, responsive design with smooth animations
- **Authentication System**: Secure user management with Supabase

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (Auth, Database, Storage)
- **Authentication**: Supabase Auth with protected routes
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account and project

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd zuexis
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Get your project URL and anon key from the project settings
3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  source_type TEXT NOT NULL CHECK (source_type IN ('video', 'youtube', 'text')),
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 5. Run the Application
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔐 Authentication

The app includes a complete authentication system:

- **Sign Up**: User registration with email verification
- **Sign In**: Secure login with email/password
- **Password Reset**: Email-based password recovery
- **Protected Routes**: Automatic redirection for unauthenticated users
- **Session Management**: Persistent login sessions

## 📱 Features

### Public Pages
- Landing page with feature overview
- Login/Signup pages
- Password reset functionality

### Protected Pages (Require Authentication)
- Dashboard with project overview
- Upload new content
- Project management
- AI caption generation
- User settings
- Billing management

## 🎨 Design Features

- **Responsive Design**: Mobile-first approach with desktop optimization
- **Dark Theme**: Modern dark UI with purple/blue accents
- **Smooth Animations**: CSS animations and transitions
- **Mobile Navigation**: Bottom navigation bar for mobile devices
- **Desktop Sidebar**: Traditional sidebar for desktop users

## 🚧 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Toast)
├── lib/               # Utility libraries (Supabase client)
├── pages/             # Page components
├── services/          # API service functions
└── types/             # TypeScript type definitions
```

### Key Components
- `AuthContext`: Manages authentication state
- `ProtectedRoute`: Guards protected pages
- `Sidebar`: Navigation component with mobile/desktop variants
- `ToastProvider`: Global notification system

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support or questions, please open an issue in the repository.
