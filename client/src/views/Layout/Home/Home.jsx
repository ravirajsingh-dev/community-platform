import React from "react";
import SliderComponent from "../Components/Slider";
import Donation from "../Components/Donation";
import About from "../Components/About";
import Gallery from "../Components/Gallery";
import Video from "../Components/Video";
import News from "../Components/News";
import Process from "../Components/Process";

const Home = () => {
  return (
    <main className="home-page">
      <SliderComponent />
      <Donation />
      <About />
      <Gallery />
      <News />
      <Video />
      <Process />
    </main>
  );
};

export default Home;
