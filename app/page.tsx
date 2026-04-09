import CreateTripBox from "@/components/create-trip-box";
import JoinTripBox from "@/components/join-trip-box";

const Home = () => {
  return (
    <main>
      <div>
        <h2>Home</h2>
        <div>
          <CreateTripBox />
          <JoinTripBox />
        </div>
      </div>
    </main>
  );
};

export default Home;