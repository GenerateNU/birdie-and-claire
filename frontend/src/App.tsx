import ProfilePictureTest from "./ProfilePictureTest";

export default function App() {
  if (window.location.pathname === "/profile-picture-test") {
    return <ProfilePictureTest />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Example Project</h1>
      <p className="text-gray-400 text-sm mb-4">
        The API is at <code className="text-gray-200">/api/v1</code>. Docs are at{" "}
        <a className="underline hover:text-white" href="http://localhost:8080/docs">
          localhost:8080/docs
        </a>
        .
      </p>
      <a className="underline hover:text-white text-sm" href="/profile-picture-test">
        Profile picture test →
      </a>
    </div>
  );
}
