const CreateTripForm = () => {
  return (
    <form>
      <h2>Create New Trip</h2>
      <input type="text" placeholder="Trip Name" />
      <input type="text" placeholder="Destination" />
      <input type="date" />
      <button type="submit">Create Trip</button>
    </form>
  );
};

export default CreateTripForm;
